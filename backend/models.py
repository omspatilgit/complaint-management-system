from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from database import Base
class Complaint(Base):
    __tablename__="complaints"
    id: Mapped[int]=mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str]=mapped_column(String(120), nullable=False)
    department: Mapped[str]=mapped_column(String(40), nullable=False)
    status: Mapped[str]=mapped_column(String(20), nullable=False, default="Pending")
    description: Mapped[str]=mapped_column(Text, nullable=False)
