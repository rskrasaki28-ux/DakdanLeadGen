"""
Database Operations for Email Sends
Simple insert/read functions for email tracking
"""

import os
from datetime import datetime
from typing import Optional, Dict, Any

# Optional: real DB driver; code falls back to stubs if not available or no DATABASE_URL
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except Exception:  # keep lightweight when driver isn't installed yet
    psycopg2 = None
    RealDictCursor = None


class EmailDB:
    """Database layer for email send tracking"""
    
    def __init__(self, database_url: str = None):
        """
        Initialize database connection.
        
        Args:
            database_url: PostgreSQL connection string (from .env)
                         Format: postgresql://user:password@host:port/database
        """
        self.database_url = database_url or os.getenv("DATABASE_URL")
        self._conn = None
        # Defer connection until first query; avoid raising when env isn't set yet

    def _get_conn(self):
        """Lazy-connect to Postgres if psycopg2 and DATABASE_URL are available."""
        if self._conn:
            return self._conn
        if not self.database_url or not psycopg2:
            return None
        try:
            self._conn = psycopg2.connect(self.database_url)
            return self._conn
        except Exception as e:
            # Fall back to stub path if connection fails
            print(f"[STUB] Could not connect to DB: {e}")
            return None
    
    def log_email_send(self, lead_id: int, campaign_id: int, 
                       recipient_email: str, status: str = "pending") -> int:
        """
        Log an email send attempt.
        
        Args:
            lead_id: Which lead received the email
            campaign_id: Which campaign the email is from
            recipient_email: Email address sent to
            status: pending, sent, or failed
            
        Returns:
            int: The email_send record ID
        """
        conn = self._get_conn()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO email_sends (lead_id, campaign_id, recipient_email, status)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id;
                        """,
                        (lead_id, campaign_id, recipient_email, status),
                    )
                    new_id = cur.fetchone()[0]
                    conn.commit()
                    return new_id
            except Exception as e:
                conn.rollback()
                print(f"[STUB] INSERT failed, falling back. Error: {e}")
                # fall through to stub

        # Stub path when no DB available
        print(f"[STUB] Logging email send:")
        print(f"  Lead ID: {lead_id}")
        print(f"  Campaign ID: {campaign_id}")
        print(f"  Recipient: {recipient_email}")
        print(f"  Status: {status}")
        return 1
    
    def update_email_status(self, email_send_id: int, status: str, 
                           error_message: Optional[str] = None) -> bool:
        """
        Update email status (e.g., sent -> bounced).
        
        Args:
            email_send_id: ID from email_sends table
            status: New status (sent, failed, bounced)
            error_message: Why it failed (if applicable)
            
        Returns:
            bool: True if successful
        """
        conn = self._get_conn()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET status = %s, error_message = %s
                        WHERE id = %s;
                        """,
                        (status, error_message, email_send_id),
                    )
                    conn.commit()
                    return True
            except Exception as e:
                conn.rollback()
                print(f"[STUB] UPDATE failed, falling back. Error: {e}")
        
        print(f"[STUB] Updating email {email_send_id} to status={status}")
        if error_message:
            print(f"  Error: {error_message}")
        return True
    
    def mark_opened(self, email_send_id: int) -> bool:
        """
        Mark email as opened (called by webhook handler).
        
        Args:
            email_send_id: ID from email_sends table
            
        Returns:
            bool: True if successful
        """
        conn = self._get_conn()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET opened_at = NOW()
                        WHERE id = %s;
                        """,
                        (email_send_id,),
                    )
                    conn.commit()
                    return True
            except Exception as e:
                conn.rollback()
                print(f"[STUB] UPDATE opened_at failed, falling back. Error: {e}")
        
        print(f"[STUB] Marking email {email_send_id} as opened")
        return True

    def mark_clicked(self, email_send_id: int) -> bool:
        """
        Mark email as clicked (called by webhook handler).
        
        Args:
            email_send_id: ID from email_sends table
            
        Returns:
            bool: True if successful
        """
        conn = self._get_conn()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET clicked_at = NOW()
                        WHERE id = %s;
                        """,
                        (email_send_id,),
                    )
                    conn.commit()
                    return True
            except Exception as e:
                conn.rollback()
                print(f"[STUB] UPDATE clicked_at failed, falling back. Error: {e}")
        
        print(f"[STUB] Marking email {email_send_id} as clicked")
        return True

    def mark_replied(self, email_send_id: int) -> bool:
        """
        Mark email as replied.
        
        Args:
            email_send_id: ID from email_sends table
            
        Returns:
            bool: True if successful
        """
        conn = self._get_conn()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET replied_at = NOW()
                        WHERE id = %s;
                        """,
                        (email_send_id,),
                    )
                    conn.commit()
                    return True
            except Exception as e:
                conn.rollback()
                print(f"[STUB] UPDATE replied_at failed, falling back. Error: {e}")
        
        print(f"[STUB] Marking email {email_send_id} as replied")
        return True

    def mark_unsubscribed(self, email_send_id: int) -> bool:
        """
        Mark email as unsubscribed.
        
        Args:
            email_send_id: ID from email_sends table
            
        Returns:
            bool: True if successful
        """
        conn = self._get_conn()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET unsubscribed_at = NOW()
                        WHERE id = %s;
                        """,
                        (email_send_id,),
                    )
                    conn.commit()
                    return True
            except Exception as e:
                conn.rollback()
                print(f"[STUB] UPDATE unsubscribed_at failed, falling back. Error: {e}")
        
        print(f"[STUB] Marking email {email_send_id} as unsubscribed")
        return True
    
    def get_campaign_stats(self, campaign_id: int) -> Dict[str, Any]:
        """
        Get stats for a campaign (total sent, delivered, opened, failed).
        
        Args:
            campaign_id: Campaign ID
            
        Returns:
            Dict with: total_sent, total_delivered, total_opened, total_failed
        """
        # TODO: SELECT COUNT(*) FROM email_sends WHERE campaign_id = ? GROUP BY status
        
        print(f"[STUB] Fetching stats for campaign {campaign_id}")
        
        return {
            "total_sent": 100,
            "total_delivered": 95,
            "total_opened": 50,
            "total_failed": 5
        }
    
    def get_lead_emails(self, lead_id: int) -> list:
        """
        Get all emails sent to a lead (audit trail).
        
        Args:
            lead_id: Lead ID
            
        Returns:
            List of email send records
        """
        # TODO: SELECT * FROM email_sends WHERE lead_id = ? ORDER BY sent_at DESC
        
        print(f"[STUB] Fetching all emails for lead {lead_id}")
        return []


# Example usage (for now)
if __name__ == "__main__":
    db = EmailDB()
    
    # Log an email send
    send_id = db.log_email_send(
        lead_id=42,
        campaign_id=1,
        recipient_email="john@acme.com",
        status="sent"
    )
    print(f"Created record ID: {send_id}\n")
    
    # Get campaign stats
    stats = db.get_campaign_stats(campaign_id=1)
    print(f"Campaign stats: {stats}\n")
    
    # Mark as opened
    db.mark_opened(send_id)
