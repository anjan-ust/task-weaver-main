from fastapi import APIRouter, HTTPException, Depends
from app.crud.users_crud import add_user,get_user_by_role,get_all_users, get_user_by_id, update_user, delete_user
from app.models.models import UserReqRes
from typing import List
from app.core.security import get_current_user  # Assumed utility for authentication

users_router = APIRouter(prefix="/Users", tags=["Users"])


@users_router.get("/getall", response_model=List[UserReqRes])
def get_all(role: str, user=Depends(get_current_user)):
    try:
        if role != "Admin":
            raise HTTPException(status_code=403, detail="Only Admin can access all users.")
        users = get_all_users()
        if not users:
            raise HTTPException(status_code=404, detail="No users found")
        return users
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@users_router.get("/getbyrole", response_model=List[UserReqRes])
def get_by_role(role: str, user=Depends(get_current_user)):
    try:
        # Allow Admin to fetch any role, otherwise ensure the caller has the requested role
        user_roles = getattr(user, "roles", [])
        if "Admin" not in user_roles and role not in user_roles:
            raise HTTPException(status_code=403, detail="You don't have access to the mentioned role")
        users = get_user_by_role(role)
        return users
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@users_router.post("/create")
def add_new_user(role:str,new_user: UserReqRes, user=Depends(get_current_user)):
    try:
        u = add_user(new_user)
        return {"detail": "User Added Successfully", "user": u}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@users_router.get("/get", response_model=UserReqRes)
def get_by_id(id: int, role: str, user=Depends(get_current_user)):
    try:
        if role != "Admin" and id != user.e_id:
            raise HTTPException(status_code=403, detail="You can only view your own details.")
        u = get_user_by_id(id)
        return u
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@users_router.put("/update")
def update_user_data(id: int, new_data: dict, role: str, user=Depends(get_current_user)):
    try:
        if role != "Admin" and id != user.e_id:
            raise HTTPException(status_code=403, detail="You can only update your own details.")
        updated = update_user(id, new_data)
        return {"detail": "User Updated Successfully", "user": updated}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@users_router.delete("/delete")
def delete_user_by_id(id: int, role: str, user=Depends(get_current_user)):
    try:
        if role != "Admin" and id != user.e_id:
            raise HTTPException(status_code=403, detail="You can only delete your own account.")
        resp = delete_user(id)
        return resp
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")