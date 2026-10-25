from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
Department=Literal["IT","HR","Facilities","Finance","Operations","Security","Other"]
Status=Literal["Pending","In Progress","Resolved"]
def clean(value: str) -> str:
    value=value.strip()
    if not value: raise ValueError("This field cannot be blank.")
    return value
class ComplaintCreate(BaseModel):
    title: str=Field(min_length=3,max_length=120)
    department: Department
    description: str=Field(min_length=10,max_length=2000)
    @field_validator("title","description","department",mode="before")
    @classmethod
    def trim_text(cls,v): return clean(v) if isinstance(v,str) else v
class ComplaintStatus(BaseModel):
    status: Status
    @field_validator("status",mode="before")
    @classmethod
    def trim_status(cls,v): return clean(v) if isinstance(v,str) else v
class ComplaintOut(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    id: int
    title: str
    department: str
    status: Status
    description: str
