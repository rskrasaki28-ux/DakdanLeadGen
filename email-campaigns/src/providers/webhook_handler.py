"""
Webhook Handler for Email Events
Receives events from email provider (opens, clicks, replies, unsubscribes)
and updates database via db_operations
"""

from typing import Dict, Any
from db.db_operations import EmailDB


class WebhookHandler:
    """Handles incoming webhook events from email providers"""
    
    def __init__(self, db: EmailDB = None):
        """
        Initialize webhook handler.
        
        Args:
            db: EmailDB instance (if None, creates new one)
        """
        self.db = db or EmailDB()
    
    def handle_event(self, event: Dict[str, Any]) -> bool:
        """
        Route incoming event to appropriate handler.
        
        Args:
            event: Dict with 'type' and 'email_send_id' keys
                   - type: 'opened', 'clicked', 'replied', 'unsubscribed'
                   - email_send_id: ID from email_sends table
        
        Returns:
            bool: True if successfully handled
        """
        event_type = event.get("type")
        email_send_id = event.get("email_send_id")
        
        if not email_send_id:
            print(f"[ERROR] Missing email_send_id in event: {event}")
            return False
        
        if event_type == "opened":
            return self.handle_opened(email_send_id)
        elif event_type == "clicked":
            return self.handle_clicked(email_send_id)
        elif event_type == "replied":
            return self.handle_replied(email_send_id)
        elif event_type == "unsubscribed":
            return self.handle_unsubscribed(email_send_id)
        else:
            print(f"[WARN] Unknown event type: {event_type}")
            return False
    
    def handle_opened(self, email_send_id: int) -> bool:
        """Handle email opened event."""
        result = self.db.mark_opened(email_send_id)
        print(f"[EVENT] Email {email_send_id} marked as opened")
        return result
    
    def handle_clicked(self, email_send_id: int) -> bool:
        """Handle email clicked event."""
        result = self.db.mark_clicked(email_send_id)
        print(f"[EVENT] Email {email_send_id} marked as clicked")
        return result
    
    def handle_replied(self, email_send_id: int) -> bool:
        """Handle email replied event."""
        result = self.db.mark_replied(email_send_id)
        print(f"[EVENT] Email {email_send_id} marked as replied")
        return result
    
    def handle_unsubscribed(self, email_send_id: int) -> bool:
        """Handle unsubscribe event."""
        result = self.db.mark_unsubscribed(email_send_id)
        print(f"[EVENT] Email {email_send_id} marked as unsubscribed")
        return result


# Example usage
if __name__ == "__main__":
    handler = WebhookHandler()
    
    # Simulate incoming events
    events = [
        {"type": "opened", "email_send_id": 1},
        {"type": "clicked", "email_send_id": 1},
        {"type": "replied", "email_send_id": 2},
        {"type": "unsubscribed", "email_send_id": 3},
    ]
    
    for event in events:
        handler.handle_event(event)
