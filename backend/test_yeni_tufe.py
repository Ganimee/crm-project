from evds import evdsAPI
from dotenv import load_dotenv
import os

load_dotenv()

evds = evdsAPI(os.getenv("EVDS_API_KEY"))

data = evds.get_data(
    ["TP.TUKFIY2025.GENEL"],
    startdate="01-01-2025",
    enddate="25-04-2026"
)

print(data.tail(10))
print(data.columns)