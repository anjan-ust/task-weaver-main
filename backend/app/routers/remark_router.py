from fastapi import APIRouter, HTTPException,Depends,UploadFile, File, Form# from app.crud.remark_crud import add_remark, get_remarks_for_task, delete_remark
from app.models.models import RemarkReqRes
from typing import List, Optional
from app.core.security import get_current_user
# from app.crud.remark_crud import add_remark, get_remarks_by_task, delete_remark_by_id, update_remark

from fastapi import APIRouter, HTTPException
from fastapi import APIRouter, UploadFile, File, Header, Form
from app.crud.remarks_crud import add_remark, get_remarks_by_task, delete_remark_by_id
from app.crud.remarks_crud import update_remark

remark_router = APIRouter(prefix="/Remark", tags=["Remark"])
 
@remark_router.get("/getbytask", response_model=List[RemarkReqRes])
def list_for_task(task_id: int, role: str, user=Depends(get_current_user)):
    remarks = get_remarks_by_task(task_id)
    if not remarks:
        raise HTTPException(status_code=404, detail="No remarks found for task")
    return remarks



@remark_router.post("/create")
def create_remark(
    task_id: int = Form(...),
    comment: str = Form(...),
    file: Optional[UploadFile] = File(None),
    role: str = Form(...),
    user=Depends(get_current_user),
):
    r = add_remark(task_id=task_id, comment=comment, e_id=getattr(user, "e_id", None), file=file, role=role, user=user)
    return {"detail": "Remark Added Successfully", "remark": r}


@remark_router.put("/update")
def update_remark_api(
    remark_id: str = Form(...),
    comment: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    role: str = Form(...),
    user=Depends(get_current_user),
):
    updated = update_remark(remark_id=remark_id, comment=comment, file=file, e_id=getattr(user, "e_id", None), role=role)
    return {"detail": "Remark Updated Successfully", "remark": updated}


@remark_router.delete("/delete")
def delete_remark_by_id_api(id: str, role: str, user=Depends(get_current_user)):
    resp = delete_remark_by_id(id, role, user)
    return resp

 


@remark_router.put("/{remark_id}")
def update_remark_api(
    remark_id: str,
    comment: str = Form(None),
    file: UploadFile = File(None),
    x_user_id: int = Header(...),
    x_role: str = Header(...)
):
    return update_remark(
        remark_id=remark_id,
        comment=comment,
        file=file,
        e_id=x_user_id,
        role=x_role
    )

# @remark_router.get("/getbytask", response_model=List[RemarkReqRes])
# def list_for_task(task_id: int):
#     try:
#         remarks = get_remarks_for_task(task_id)
#         if not remarks:
#             raise HTTPException(status_code=404, detail="No remarks found for task")
#         return remarks
#     except HTTPException as e:
#         raise e
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


# @remark_router.post("/create")
# def create_remark(new_remark: RemarkReqRes):
#     try:
#         r = add_remark(new_remark)
#         return {"detail": "Remark Added Successfully", "remark": r}
#     except HTTPException as e:
#         raise e
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


# @remark_router.delete("/delete")
# def delete_remark_by_id(id: str):
#     try:
#         resp = delete_remark(id)
#         return resp
#     except HTTPException as e:
#         raise e
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")