import sqlite3
import json
from datetime import datetime
import os

DB_PATH = 'shomrim.db'

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def init_db():
    """Initialize database with tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            callsign TEXT,
            role TEXT DEFAULT 'Member',
            avatar TEXT,
            on_duty BOOLEAN DEFAULT 0,
            on_patrol BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Incidents table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            shcad TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            address TEXT,
            postcode TEXT,
            location TEXT,
            caller_name TEXT,
            caller_phone TEXT,
            caller_is_victim BOOLEAN DEFAULT 0,
            caller_is_witness BOOLEAN DEFAULT 0,
            metadata TEXT, -- JSON string for full incident data
            created_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(phone)
        )
    ''')
    
    # Incident participants (victims, witnesses, suspects)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incident_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT NOT NULL,
            type TEXT NOT NULL, -- 'victim', 'witness', 'suspect'
            name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            description TEXT,
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # Incident assignments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incident_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT NOT NULL,
            user_phone TEXT NOT NULL,
            status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id),
            FOREIGN KEY (user_phone) REFERENCES users(phone)
        )
    ''')
    
    # Incident notes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incident_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT NOT NULL,
            user_phone TEXT NOT NULL,
            note TEXT NOT NULL,
            is_follow_up BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id),
            FOREIGN KEY (user_phone) REFERENCES users(phone)
        )
    ''')
    
    # Incident history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incident_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT NOT NULL,
            user_phone TEXT,
            action TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # Police info
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incident_police_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT NOT NULL,
            cad_ref TEXT,
            cris_ref TEXT,
            chs_ref TEXT,
            officer_name TEXT,
            officer_badge TEXT,
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # Arrests
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incident_arrests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT NOT NULL,
            name TEXT NOT NULL,
            details TEXT,
            arrested_at TIMESTAMP,
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # Contacts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            organization TEXT,
            notes TEXT,
            user_phone TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_phone) REFERENCES users(phone)
        )
    ''')
    
    # Notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_phone TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            incident_id TEXT,
            is_read BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_phone) REFERENCES users(phone),
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        )
    ''')
    
    # Suspects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS suspects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            alias TEXT,
            date_of_birth TEXT,
            physical_description TEXT,
            photo TEXT,
            last_known_address TEXT,
            phone TEXT,
            email TEXT,
            known_associates TEXT,
            criminal_history TEXT,
            notes TEXT,
            created_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(phone)
        )
    ''')
    
    # Vehicles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            registration TEXT NOT NULL,
            make TEXT,
            model TEXT,
            color TEXT,
            year TEXT,
            vin TEXT,
            owner_name TEXT,
            owner_address TEXT,
            owner_phone TEXT,
            status TEXT DEFAULT 'active',
            assigned_to TEXT,
            notes TEXT,
            photo TEXT,
            created_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(phone),
            FOREIGN KEY (assigned_to) REFERENCES users(phone)
        )
    ''')
    
    # PTT messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ptt_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_phone TEXT NOT NULL,
            user_name TEXT NOT NULL,
            channel TEXT NOT NULL,
            audio_data BLOB NOT NULL,
            content_type TEXT DEFAULT 'audio/webm',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_phone) REFERENCES users(phone)
        )
    ''')
    
    # Create index for faster queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_ptt_created_at 
        ON ptt_messages(created_at DESC)
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")

def row_to_dict(row):
    """Convert sqlite3.Row to dictionary"""
    if row is None:
        return None
    return dict(row)

def rows_to_list(rows):
    """Convert list of sqlite3.Row to list of dictionaries"""
    return [dict(row) for row in rows]

# Initialize database on import
if not os.path.exists(DB_PATH):
    init_db()
