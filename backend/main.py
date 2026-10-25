from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from models import Complaint
from schemas import ComplaintCreate, ComplaintOut, ComplaintStatus

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        if db.query(Complaint).count() == 0:
            samples = [
                ("Laptop overheating in design studio", "IT", "Pending", "Several design workstations overheat during rendering, interrupting work."),
                ("Broken air conditioning, west wing", "Facilities", "Pending", "The west wing AC has been unreliable for three days."),
                ("Payroll tax deduction discrepancy", "Finance", "Pending", "My latest payslip shows an unexpected tax deduction."),
                ("Badge reader fails at side entrance", "Security", "Pending", "The side entrance reader rejects valid employee badges."),
                ("VPN access for new analyst", "IT", "In Progress", "A new analyst needs secure VPN access to the reporting environment."),
                ("Request ergonomic chair assessment", "HR", "In Progress", "Please arrange an ergonomic chair assessment for my workstation."),
                ("Replace flickering meeting room lights", "Facilities", "Resolved", "The lights in Cedar room were flickering during meetings."),
                ("Update emergency contact details", "HR", "Resolved", "Please update the emergency contact listed in my employee profile."),
                ("Recycling bins for third floor", "Operations", "Resolved", "Add clearly marked recycling bins near the third-floor kitchen."),
            ]
            db.add_all([Complaint(title=t, department=d, status=s, description=x) for t,d,s,x in samples]); db.commit()
    yield
app = FastAPI(title="ClearDesk API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"], allow_headers=["*"])
@app.get("/health")
def health(): return {"status":"healthy"}
@app.get("/complaints", response_model=list[ComplaintOut])
def list_complaints(db: Session=Depends(get_db)): return db.query(Complaint).order_by(Complaint.id.asc()).all()
@app.post("/complaints", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(payload: ComplaintCreate, db: Session=Depends(get_db)):
    row=Complaint(**payload.model_dump(), status="Pending"); db.add(row); db.commit(); db.refresh(row); return row
@app.patch("/complaints/{complaint_id}", response_model=ComplaintOut)
def update_complaint(complaint_id: int, payload: ComplaintStatus, db: Session=Depends(get_db)):
    row=db.get(Complaint, complaint_id)
    if not row: raise HTTPException(404, "Complaint not found")
    row.status=payload.status; db.commit(); db.refresh(row); return row
@app.delete("/complaints/{complaint_id}", status_code=204)
def delete_complaint(complaint_id: int, db: Session=Depends(get_db)):
    row=db.get(Complaint, complaint_id)
    if not row: raise HTTPException(404, "Complaint not found")
    db.delete(row); db.commit()
