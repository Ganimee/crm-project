from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

sifre = "12345"

hashli = pwd_context.hash(sifre)

print(hashli)