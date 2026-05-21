import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=int(os.getenv("DB_PORT", 3306)),
        ssl_disabled=False
    )

    cursor = conn.cursor()

    cursor.execute("""
        SET SESSION sql_mode = (
            SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', '')
        )
    """)

    cursor.close()

    return conn