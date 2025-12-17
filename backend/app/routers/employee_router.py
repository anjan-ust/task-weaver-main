from fastapi import APIRouter, HTTPException, Depends
from app.crud.employee_crud import get_all_employees, add_employee, get_by_employee_id, update_employee, delete_employee
from app.models.models import EmployeeReqRes
from typing import List
from app.core.security import get_current_user  # Assumed utility for authentication
employee_router = APIRouter(prefix="/Employee", tags=["Employee"])

@employee_router.get("/getall", response_model=List[EmployeeReqRes])
def get_all(role: str, user=Depends(get_current_user)):
    try:
        employees = get_all_employees(role, user)
        if not employees:
            raise HTTPException(status_code=404, detail="No employees found")
        return employees
    except HTTPException as e:
        raise e  # Re-raise the specific HTTPException
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@employee_router.post("/create")
def add_new_employee(role: str, new_emp: EmployeeReqRes, user=Depends(get_current_user)):
    try:
        if role != "Admin":
            raise HTTPException(status_code=403, detail="Only Admin can create employees.")
        
        new_employee = add_employee(new_emp, role, user)
        return {"detail": "Employee Added Successfully", "employee": new_employee}
    except HTTPException as e:
        raise e  # Re-raise the specific HTTPException
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@employee_router.get("/get", response_model=EmployeeReqRes)
def get_by_id(id: int, role: str, user=Depends(get_current_user)):
    try:
        emp = get_by_employee_id(id, role, user)
        return emp
    except HTTPException as e:
        raise e  # Re-raise the specific HTTPException
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@employee_router.put("/update")
def update_employee_data(id: int, new_data: dict, role: str, user=Depends(get_current_user)):
    try:
        updated_emp = update_employee(id, new_data, role, user)
        return {"detail": "Employee Updated Successfully", "employee": updated_emp}
    except HTTPException as e:
        raise e  # Re-raise the specific HTTPException
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@employee_router.delete("/delete")
def delete_employee_by_id(id: int, role: str, user=Depends(get_current_user)):
    try:
        delete_response = delete_employee(id, role, user)
        return delete_response  # Returns {"detail": "Employee Deleted Successfully"}
    except HTTPException as e:
        raise e  # Re-raise the specific HTTPException
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")