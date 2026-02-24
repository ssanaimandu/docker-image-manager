import asyncio
import time
from app.config import get_current_config, save_config
from app.services.cleanup import execute_cleanup
from app.utils.logger import get_logger

log = get_logger(__name__)

# Constants for seconds
ONE_DAY = 24 * 3600
ONE_WEEK = 7 * ONE_DAY
ONE_MONTH = 30 * ONE_DAY  # Approximation

async def run_scheduler():
    """Background task to run automated cleanup based on schedule."""
    # Wait a solid minute before starting to ensure systems are up
    await asyncio.sleep(60)
    
    while True:
        try:
            cfg = get_current_config()
            schedule = getattr(cfg, "auto_cleanup_schedule", "disabled")
            last_run = getattr(cfg, "last_cleanup_run", 0.0)
            
            if schedule != "disabled":
                now = time.time()
                diff = now - last_run
                
                should_run = False
                if schedule == "daily" and diff >= ONE_DAY:
                    should_run = True
                elif schedule == "weekly" and diff >= ONE_WEEK:
                    should_run = True
                elif schedule == "monthly" and diff >= ONE_MONTH:
                    should_run = True
                    
                if should_run:
                    log.info("Running scheduled automatic cleanup (%s)", schedule)
                    result = await asyncio.to_thread(execute_cleanup)
                    log.info("Scheduled cleanup finished. Deleted: %d, Failed: %d, Freed Bytes: %d", 
                             result.total_deleted, result.total_failed, result.total_freed_bytes)
                    
                    # Update config with last run time
                    cfg = get_current_config()  # reload in case it changed during cleanup
                    cfg.last_cleanup_run = time.time()
                    save_config(cfg)
                    
        except Exception as exc:
            log.error("Error in scheduler: %s", exc)
            
        # Check every 1 hour
        await asyncio.sleep(3600)
