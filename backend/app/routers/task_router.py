from fastapi import APIRouter, HTTPException, Depends
from app.crud.task_crud import add_task, get_all_tasks, get_task_by_id,patch_priority,get_task_by_status,patch_status,update_task, delete_task
from app.core.security import get_current_user
from app.models.models import TaskReqRes, UserRole
from typing import List
from datetime import datetime
task_router = APIRouter(prefix="/Task", tags=["Task"])


@task_router.get("/getall", response_model=List[TaskReqRes])
def get_all(role: str, user=Depends(get_current_user)):
    try:
        tasks = get_all_tasks(role,user)
        if not tasks:
            raise HTTPException(status_code=404, detail="No tasks found")
        return tasks
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@task_router.get("/getbystatus",response_model=List[TaskReqRes])
def get_by_status(status,role,user=Depends(get_current_user)):
    try:
        if role not in user.roles:
            raise HTTPException(status_code=409,detail="The user doesnt have the mentioned role")
        return get_task_by_status(status,role,user)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@task_router.post("/create")
def add_new_task(role: str,new_task: TaskReqRes,user=Depends(get_current_user)):
    try:
        if role != "Manager" and role != "Admin":
            raise HTTPException(status_code=409,detail="The user doesn't have the mentioned role")
        t = add_task(new_task,role,user)
        return {"detail": "Task Added Successfully", "task": t}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@task_router.get("/get", response_model=TaskReqRes)
def get_by_id(id: int,user=Depends(get_current_user)):
    try:
        t = get_task_by_id(id,user)
        return t
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@task_router.get("/getbystatus", response_model=List[TaskReqRes])
def get_by_status(status: str, role: str, user=Depends(get_current_user)):
    try:
        if role not in user.roles:
            raise HTTPException(status_code=409, detail="The user doesn't have the mentioned role")
        return get_task_by_status(status, role, user)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@task_router.put("/update")
def update_task_data(t_id: int,role: str,
    title: str = None,
    description: str = None,
    assigned_to: int = None,
    priority: str = None,
    status: str = None,
    reviewer: int = None,
    expected_closure: datetime = None, 
    user=Depends(get_current_user),
    ):
    try:
        if role not in user.roles:
            raise HTTPException(status_code=409, detail="The user doesn't have the mentioned role")
        
        # FIXED: Check if 'status' key exists before accessing it
        updated_task = update_task(
            t_id=t_id,
            title=title,
            description=description,
            assigned_to=assigned_to,
            priority=priority,
            status=status,
            reviewer=reviewer,
            expected_closure=expected_closure,
            role=role,
            user=user
        )
        return {"detail": "Task Updated Successfully", "task": updated_task}
    except HTTPException as e:
        raise e

@task_router.patch("/patch")
def patch_stat(id: int, status: str, role: str, user=Depends(get_current_user)):
    try:
        # FIXED: Changed 'and' to 'or' for proper validation
        if role not in user.roles or role.upper() == "ADMIN":
            raise HTTPException(status_code=409, detail="The user doesn't have the mentioned role")
        
        patched = patch_status(id, status, role, user)
        return {"detail": "Patched the task", "task": patched}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
@task_router.delete("/delete")
def delete_task_by_id(id: int, role: str, user=Depends(get_current_user)):
    try:
        # FIXED: Simplified logic - only Admin can delete
        if role.upper() != "ADMIN":
            raise HTTPException(status_code=403, detail="Only Admin can delete tasks")
        
        if "Admin" not in user.roles:
            raise HTTPException(status_code=403, detail="User doesn't have Admin role")
        
        resp = delete_task(id, user)  # FIXED: Pass user parameter
        return resp
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    
    
@task_router.patch("/{t_id}/priority")
async def update_task_priority(t_id: int, priority: str, role: str, user=Depends(get_current_user)):
    # Call patch_priority function to handle priority change
    try:
        return patch_priority(t_id=t_id, priority=priority, role=role, user=user)
    except HTTPException as e:
        raise e