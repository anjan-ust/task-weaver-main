from app.database.mysql_connection import get_connection
from app.crud.users_crud import get_user_by_id
from app.schemas.schemas import TaskSchema
from app.models.models import TaskReqRes
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_
from fastapi import HTTPException
from datetime import datetime, timezone
import logging


def add_task(new_task: TaskReqRes, role, user):
    session = None
    try:
        if role not in ["Manager", "Admin"]:
            raise HTTPException(status_code=403, detail="Only Manager and Admin can create a new task")

        session = get_connection()
        task = TaskSchema(
            title=new_task.title,
            description=new_task.description,
            assigned_to=new_task.assigned_to,
            assigned_by=None,
            assigned_at=None,
            updated_by=new_task.updated_by,
            updated_at=None,
            priority=new_task.priority,
            status="TO_DO",
            reviewer=new_task.reviewer,
            created_by=user.e_id,
            expected_closure=new_task.expected_closure,
            actual_closure=None
        )
        # set assigned_at if assigned_to is present
        if task.assigned_to:
            # ensure the assigned user has Developer role persisted
            from app.crud.users_crud import add_role_to_user

            add_role_to_user(task.assigned_to, "Developer")
            task.assigned_by = user.e_id
            task.assigned_at = datetime.now()
        if task.reviewer:
            # ensure the reviewer has Manager role persisted
            from app.crud.users_crud import add_role_to_user

            add_role_to_user(task.reviewer, "Manager")

        session.add(task)
        session.commit()
        session.refresh(task)
        return TaskReqRes.model_validate(task)
    except SQLAlchemyError as e:
        if session:
            session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if session:
            session.close()


def get_all_tasks(role, user):
    session = None
    try:
        session = get_connection()
        if role == "Manager":
            if "Manager" in user.roles:
                # Managers should see tasks they review, tasks they created, and tasks they assigned
                tasks = session.query(TaskSchema).filter(
                    or_(
                        TaskSchema.reviewer == user.e_id,
                        TaskSchema.created_by == user.e_id,
                        TaskSchema.assigned_by == user.e_id,
                    )
                ).all()
            else:
                raise HTTPException(status_code=403, detail="Not Authorized")
        elif role == "Admin":
            if "Admin" in user.roles:
                tasks = session.query(TaskSchema).all()
            else:
                raise HTTPException(status_code=403, detail="Not Authorized")
        else:
            if role in user.roles:
                tasks = session.query(TaskSchema).filter(TaskSchema.assigned_to == user.e_id).all()
            else:
                raise HTTPException(status_code=403, detail="Not Authorized")
        return [TaskReqRes.from_orm(t) for t in tasks]
    except SQLAlchemyError as e:
        if session:
            session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if session:
            session.close()


# FIXED: Added user parameter
def get_task_by_id(t_id: int, user):
    session = None
    try:
        session = get_connection()
        t = session.query(TaskSchema).filter(TaskSchema.t_id == t_id).first()
        if not t:
            raise HTTPException(status_code=404, detail="Task Not Found")
        # Authorization logic:
        # - Admin can view any task
        # - Manager can view if they are the reviewer, the creator, or the assigner
        # - Developers (and others) can view only if they are the assigned_to
        if "Admin" not in user.roles:
            if "Manager" in user.roles:
                if not (
                    t.reviewer == user.e_id
                    or t.created_by == user.e_id
                    or t.assigned_by == user.e_id
                ):
                    raise HTTPException(status_code=403, detail="Not authorized to view this task")
            else:
                # Non-manager (e.g., developer) must be the assignee
                if t.assigned_to != user.e_id:
                    raise HTTPException(status_code=403, detail="Not authorized to view this task")
        # Optional: Add authorization check
        # Uncomment if you want to restrict access based on user role
        # if "Admin" not in user.role:
        #     if "Manager" in user.role and t.reviewer != user.e_id:
        #         raise HTTPException(status_code=403, detail="Not authorized to view this task")
        #     elif t.assigned_to != user.e_id:
        #         raise HTTPException(status_code=403, detail="Not authorized to view this task")
        
        return TaskReqRes.model_validate(t)
    except SQLAlchemyError as e:
        if session:
            session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if session:
            session.close()


def get_task_by_status(status, role, user):
    try:
        data = get_all_tasks(role, user)
        new_data = [task for task in data if task.status == status]
        return new_data
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


def update_task(
    t_id: int,
    title: str = None,
    description: str = None,
    assigned_to: int = None,
    priority: str = None,
    status: str = None,
    reviewer: int = None,
    expected_closure: datetime = None,
    role: str = None,
    user= None
) :
    session = None
    try:
        # Role-based access control
        if role not in ["Manager", "Admin"]:
            raise HTTPException(status_code=403, detail="You don't have permission to update this task")
        session=get_connection()
        # Retrieve task
        t = session.query(TaskSchema).filter(TaskSchema.t_id == t_id).first()
        if not t:
            raise HTTPException(status_code=404, detail="Task not found")

        # Log incoming update for debugging
        logging.info(f"update_task called t_id={t_id} assigned_to={assigned_to} priority={priority} status={status} reviewer={reviewer} expected_closure={expected_closure}")
        logging.info(f"existing task: assigned_to={t.assigned_to} assigned_by={t.assigned_by} reviewer={t.reviewer} status={t.status}")

        # Update fields if provided
        if title:
            t.title = title
        if description:
            t.description = description
        if assigned_to is not None:
            assigned_user = get_user_by_id(assigned_to)
            if not assigned_user:
                raise HTTPException(status_code=404, detail="Assigned user not found")
            t.assigned_to = assigned_to
            t.assigned_at = datetime.now()  # Update assignment timestamp

            t.assigned_by = user.e_id
            # ensure assigned user has Developer role persisted
            from app.crud.users_crud import add_role_to_user
            add_role_to_user(assigned_to, "Developer")
        if priority:
            t.priority = priority
        if status:
            patch_status(t_id=t_id, status=status, role=role, user=user, session=session)
            t.status = status
        if reviewer is not None:
            reviewer_user = get_user_by_id(reviewer)
            if not reviewer_user:
                raise HTTPException(status_code=404, detail="Reviewer not found")
            t.reviewer = reviewer
            # ensure reviewer has Manager role persisted
            from app.crud.users_crud import add_role_to_user
            add_role_to_user(reviewer, "Manager")
        if expected_closure:
            t.expected_closure = expected_closure

        # Update timestamps
        t.updated_by = user.e_id
        t.updated_at = datetime.now()


        # Commit the transaction
        session.commit()
        logging.info(f"update_task committed for t_id={t_id}")
        session.refresh(t)

        # Return updated task as a response
        return TaskReqRes.model_validate(t)

    except SQLAlchemyError as e:
        if session:
            session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if session:
            session.close()

def patch_priority(t_id: int, priority: str, role: str, user):
    session = None
    try:
        # Retrieve task
        session=get_connection()
        t = session.query(TaskSchema).filter(TaskSchema.t_id == t_id).first()
        if not t:
            raise HTTPException(status_code=404, detail="Task not found")

        # Check if the user has permission to change the priority
        if role not in ["Manager", "Admin"]:
            raise HTTPException(status_code=403, detail="You do not have permission to change the priority of this task")

        # Ensure the user is the manager of the task if they are not an Admin
        if role == "Manager":
            if user.e_id != t.reviewer:  # Assuming `reviewer` is the manager of the task
                raise HTTPException(status_code=403, detail="You are not the manager of this task")

        # Update the priority of the task
        t.priority = priority
        t.updated_by = user.e_id
        t.updated_at = datetime.now()

        # Commit transaction
        session.commit()
        session.refresh(t)

        # Return updated task as a response
        return TaskReqRes.from_orm(t)

    except SQLAlchemyError as e:
        if session:
            session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if session:
            session.close()


def patch_status(t_id, status, role, user, session=None):
    # If a session is provided, operate within it without committing/closing here.
    created_session = False
    try:
        if session is None:
            session = get_connection()
            created_session = True

        t = session.query(TaskSchema).filter(TaskSchema.t_id == t_id).first()
        if not t:
            raise HTTPException(status_code=404, detail="Task Not Found")
        
        if role == "Manager":
            if user.e_id != t.reviewer:
                raise HTTPException(status_code=403, detail="Not Reviewer for the task")
            if (status.upper() == "IN_PROGRESS" or status.upper() == "DONE") and t.status.upper() == "REVIEW":
                if status.upper() == "DONE":
                    t.actual_closure = datetime.now()
                t.status = status
            else:
                raise HTTPException(status_code=409, detail="Can only change status to IN_PROGRESS or DONE from REVIEW status")
        else:
            if user.e_id != t.assigned_to:
                raise HTTPException(status_code=403, detail="Not assigned to this task")
            if status.upper() == "IN_PROGRESS"  and t.status.upper() == "TO_DO":
                t.status = status
            elif status.upper() == "REVIEW" and t.status.upper() == "IN_PROGRESS":
                t.status = status
            else:
                raise HTTPException(status_code=409, detail="Can only change status from TO_DO to IN_PROGRESS or from IN_PROGRESS to REVIEW")

        if created_session:
            session.commit()
            session.refresh(t)
            return TaskReqRes.model_validate(t)
        else:
            return TaskReqRes.model_validate(t)
    except SQLAlchemyError as e:
        if created_session and session:
            session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if created_session and session:
            session.close()


def delete_task(t_id: int, user):
    session = None
    try:
        session = get_connection()
        t = session.query(TaskSchema).filter(TaskSchema.t_id == t_id).first()
        if not t:
            raise HTTPException(status_code=404, detail="Task Not Found")
        
        # Verify user has Admin role
        if "Admin" not in user.roles:
            raise HTTPException(status_code=403, detail="Only Admin can delete tasks")
        
        session.delete(t)
        session.commit()
        return {"detail": "Task Deleted Successfully"}
    except SQLAlchemyError as e:
        if session:
            session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if session:
            session.close()