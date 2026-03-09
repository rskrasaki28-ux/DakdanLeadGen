#!/usr/bin/env python3
"""
Main Scraper Orchestrator - Week 3: Google Maps Focus
Ties together Config, Google Maps Client, Location Filter, and Supabase Writer.
"""

import argparse
import sys
import time
from dotenv import load_dotenv

# Importing team components as per project structure
from src.config import ConfigManager
from src.location_filter import LocationFilter  
from src.google_maps_client import GoogleMapsClient
from src.supabase_writer import SupabaseWriter
from src.logger import setup_logger
from src.error_handler import handle_api_error

load_dotenv()

def main():
    """Main scraper workflow: Load -> Initialize -> Search -> Filter -> Save"""
    
    # Parse Command Line Arguments
    parser = argparse.ArgumentParser(description='Dakdan Lead Gen: Google Maps Scraper (Week 3 MVP)')
    parser.add_argument('--location', type=str, required=True, help='Base location (e.g., "Miami, FL")')
    parser.add_argument('--radius', type=int, default=50, help='Search radius in miles')
    parser.add_argument('--keywords', type=str, default='advertising agency,marketing agency', 
                        help='Comma-separated search keywords')
    parser.add_argument('--max-results', type=int, default=100, help='Target number of leads')
    
    args = parser.parse_args()
    
    # Initialize Components
    logger = setup_logger()
    logger.info(f"Starting scrape for {args.keywords} in {args.location}")
    
    try:
        config = ConfigManager()
        # Zach's Client: Rate limit enforced at 1 request per 3 seconds
        gmaps = GoogleMapsClient(api_key=config.google_maps_key, rate_limit_seconds=3)
        # Jay's Filter: Distance calculation logic
        loc_filter = LocationFilter(base_location=args.location, radius_miles=args.radius)
        # Colin's Writer: Supabase/PostgreSQL integration with deduplication
        db = SupabaseWriter()
        
        leads_count = 0
        keyword_list = [k.strip() for k in args.keywords.split(',')]

        for keyword in keyword_list:
            if leads_count >= args.max_results:
                break
                
            logger.info(f"Processing {len(keyword_list)} keywords with max {args.max_results} results")
            logger.info(f"Searching for keyword: {keyword}")

            
            # Fetch leads from Google Maps
            try:
                raw_results = gmaps.search_places(query=f"{keyword} in {args.location}")

                #Process each place result
                for place in raw_results:
                    if leads_count >= args.max_results:
                        logger.info("Reached Max Results Limit")
                        break
                    
                    # Filter by distance (Week 3 Requirement: < 50 miles)
                    if not loc_filter.is_within_range(place['location']):
                        logger.debug(f"Skipping {place.get('name')} - outside radius")
                        continue
                        
                        # Data Validation & Supabase Insertion
                        # Basic info: name, website, location, phone
                        success = db.insert_lead({
                            "name": place.get("name"),
                            "website": place.get("website"),
                            "location": place.get("formatted_address"),
                            "phone": place.get("phone_number"),
                            "source": "Google Maps"
                        })
                        
                        if success:
                            leads_count += 1
                            logger.info(f"Saved lead {leads_count}: {place.get('name')}")
                        else:
                            logger.debug(f"Skipped duplicate or invalid: {place.get('name')}")
                            
            except Exception as api_err:
                # Samuel's Error Handling: Circuit breaker/Exponential backoff logic
                handle_api_error(api_err)
                logger.error(f"API Error encountered: {api_err}")

        logger.info(f"Scrape complete. Total leads added to Supabase: {leads_count}")
        return 0

    except KeyboardInterrupt:
        logger.warning("Scraper interrupted by user.")
        return 130
    except Exception as e:
        logger.error(f"Critical System Failure: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
