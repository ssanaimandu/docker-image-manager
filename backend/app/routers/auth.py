from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.config import get_current_config
from app.utils.security import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
import httpx
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

class Token(BaseModel):
    access_token: str
    token_type: str

class OAuthLoginRequest(BaseModel):
    code: str
    provider: str

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
):
    cfg = get_current_config()
    if not cfg.auth.enabled:
        # If disabled, any login is essentially admin
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": "admin"}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

    user = cfg.auth.local.username
    if form_data.username != user or not verify_password(form_data.password, cfg.auth.local.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/oauth", response_model=Token)
async def oauth_login(request: OAuthLoginRequest):
    """Handle OAuth callback to exchange code for token and verify user"""
    cfg = get_current_config()
    if not cfg.auth.enabled:
        raise HTTPException(status_code=400, detail="Auth is disabled")

    if request.provider == 'github' and cfg.auth.oauth.github.enabled:
        # GitHub OAuth Flow
        async with httpx.AsyncClient() as client:
            # 1. Exchange code for access token
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": cfg.auth.oauth.github.client_id,
                    "client_secret": cfg.auth.oauth.github.client_secret,
                    "code": request.code,
                },
                headers={"Accept": "application/json"}
            )
            token_data = token_response.json()
            if "error" in token_data:
                raise HTTPException(status_code=401, detail=token_data.get("error_description", "Invalid OAuth code"))
            
            # 2. Get user info
            user_response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {token_data['access_token']}",
                    "Accept": "application/json"
                }
            )
            if user_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Failed to fetch user from GitHub")
                
            user_data = user_response.json()
            username = user_data.get("login")
            
            # Generate JWT Token for dim
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": f"github:{username}"}, expires_delta=access_token_expires
            )
            return {"access_token": access_token, "token_type": "bearer"}

    elif request.provider == 'oidc' and cfg.auth.oauth.oidc.enabled:
        # Generic OIDC Flow
        oidc = cfg.auth.oauth.oidc
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                oidc.token_url,
                data={
                    "client_id": oidc.client_id,
                    "client_secret": oidc.client_secret,
                    "code": request.code,
                    "grant_type": "authorization_code",
                    # Some OIDC providers require redirect_uri here.
                    # As a generic solution we pass nothing or expect it to configure if required, but typically:
                    "redirect_uri": "http://localhost:3000/login", # Typical dev, in prod this should be configurable
                },
                headers={"Accept": "application/json"}
            )
            token_data = token_response.json()
            if "error" in token_data:
                raise HTTPException(status_code=401, detail=token_data.get("error_description", "Invalid OAuth code"))
            
            user_response = await client.get(
                oidc.userinfo_url,
                headers={
                    "Authorization": f"Bearer {token_data['access_token']}",
                    "Accept": "application/json"
                }
            )
            if user_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Failed to fetch user from OIDC provider")
                
            user_data = user_response.json()
            # typically subject is 'sub' or 'preferred_username' or 'email'
            username = user_data.get("preferred_username") or user_data.get("email") or user_data.get("sub")
            
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": f"oidc:{username}"}, expires_delta=access_token_expires
            )
            return {"access_token": access_token, "token_type": "bearer"}

    raise HTTPException(status_code=400, detail="Unsupported or disabled OAuth provider")

@router.get("/status")
def get_auth_status():
    """Returns the current state of auth settings without leaking secrets"""
    cfg = get_current_config()
    return {
        "enabled": cfg.auth.enabled,
        "github_enabled": cfg.auth.oauth.github.enabled,
        "github_client_id": cfg.auth.oauth.github.client_id if cfg.auth.oauth.github.enabled else "",
        "oidc_enabled": cfg.auth.oauth.oidc.enabled,
        "oidc_provider_name": cfg.auth.oauth.oidc.provider_name,
        "oidc_client_id": cfg.auth.oauth.oidc.client_id if cfg.auth.oauth.oidc.enabled else "",
        "oidc_authorization_url": cfg.auth.oauth.oidc.authorization_url if cfg.auth.oauth.oidc.enabled else "",
        "oidc_scope": cfg.auth.oauth.oidc.scope if cfg.auth.oauth.oidc.enabled else ""
    }
