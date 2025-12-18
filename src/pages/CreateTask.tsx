import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  taskService,
  employeeService,
  userService,
  Employee,
} from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from "lucide-react";

interface TaskFormData {
  title: string;
  description: string;
  assigned_to?: number;
  priority: "high" | "medium" | "low";
  reviewer?: number;
  expected_closure: string;
}

interface CreateTaskProps {
  onClose?: () => void;
  hideHeader?: boolean;
}

const CreateTask: React.FC<CreateTaskProps> = ({ onClose, hideHeader }) => {
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    priority: "medium",
    expected_closure: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof TaskFormData, string>>
  >({});

  // Fetch employees for dropdowns
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setIsLoadingEmployees(true);
        // map frontend role to backend role casing
        const roleMap: { [key: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = currentRole ? roleMap[currentRole] : undefined;
        const response = await employeeService.getEmployees(
          1,
          100,
          backendRole
        );
        setEmployees(response.data || []);
      } catch (error: any) {
        console.error("Error fetching employees:", error);
        // Don't show a destructive toast popup for managers — fall back to empty list silently.
        // This prevents a blocking popup when manager-specific filtering leads to expected errors.
        if (currentRole !== "manager") {
          toast({
            title: "Error",
            description: "Failed to load employees. Please try again.",
            variant: "destructive",
          });
        }
        setEmployees([]);
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [toast, currentRole]);

  // Fetch managers for Reviewer dropdown (any manager can be assigned as reviewer)
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const mgrs = await userService.getUsersByRole("Manager");
        // map each user to Employee by fetching employee details
        const roleMap: { [key: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = currentRole ? roleMap[currentRole] : "Manager";

        const detailed = await Promise.all(
          mgrs.map(async (u: any) => {
            try {
              const emp = await employeeService.getEmployeeById(
                u.e_id,
                backendRole
              );
              return emp as Employee;
            } catch (e) {
              // fallback minimal
              return {
                e_id: u.e_id,
                name: `Manager ${u.e_id}`,
                email: "",
                designation: "Manager",
              } as Employee;
            }
          })
        );
        let mgrList = detailed || [];

        // If the current user is a Manager or Admin, include them in reviewer options
        // and default the reviewer to the creator (so the dropdown auto-selects the creator)
        try {
          if (
            (currentRole === "manager" || currentRole === "admin") &&
            user?.id
          ) {
            const myEid = parseInt(user.id, 10);
            const already = mgrList.find((m) => m.e_id === myEid);
            if (!already) {
              try {
                const me = await employeeService.getEmployeeById(
                  myEid,
                  backendRole
                );
                if (me) mgrList = [me, ...mgrList];
              } catch (e) {
                // if we can't fetch full employee, still add a minimal entry
                mgrList = [
                  {
                    e_id: myEid,
                    name: `User ${myEid}`,
                    email: "",
                    designation: currentRole === "admin" ? "Admin" : "Manager",
                  },
                  ...mgrList,
                ];
              }
            }

            // set default reviewer to creator if not already set
            setFormData((prev) => ({
              ...prev,
              reviewer: prev.reviewer ?? myEid,
            }));
          }
        } catch (e) {
          // ignore fallback errors
        }

        setManagers(mgrList);
      } catch (err) {
        console.error("Failed to load managers for reviewer dropdown", err);
        setManagers([]);
      }
    };

    fetchManagers();
  }, [currentRole]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TaskFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length > 100) {
      newErrors.title = "Title must be less than 100 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > 250) {
      newErrors.description = "Description must be less than 250 characters";
    }

    if (!formData.expected_closure) {
      newErrors.expected_closure = "Expected closure date is required";
    } else {
      const selectedDate = new Date(formData.expected_closure);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.expected_closure =
          "Expected closure date cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Map frontend role to backend enum casing
      const roleMap: { [key: string]: string } = {
        admin: "Admin",
        manager: "Manager",
        developer: "Developer",
      };

      const backendRole = currentRole
        ? roleMap[currentRole] || undefined
        : undefined;

      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        expected_closure: new Date(formData.expected_closure).toISOString(),
        ...(formData.assigned_to && { assigned_to: formData.assigned_to }),
        ...(formData.reviewer && { reviewer: formData.reviewer }),
        // include who assigned the task (current user) if available
        ...(formData.assigned_to &&
          user?.id && {
            assigned_by: parseInt(user.id, 10),
            assigned_at: new Date().toISOString(),
          }),
      };

      await taskService.createTask(taskData, backendRole);

      toast({
        title: "Success!",
        description: "Task created successfully.",
        variant: "default",
      });

      // Navigate back to dashboard or call onClose when embedded
      if (onClose) onClose();
      else navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.detail ||
          "Failed to create task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof TaskFormData,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const priorityColors = {
    high: "text-destructive",
    medium: "text-status-inprogress",
    low: "text-primary",
  };

  const priorityIcons = {
    high: AlertCircle,
    medium: AlertCircle,
    low: CheckCircle2,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header (optional in embedded mode) */}
      {!hideHeader && (
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (onClose ? onClose() : navigate("/dashboard"))}
            className="hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Task</h1>
            <p className="text-muted-foreground mt-1">
              Fill in the details below to create a new task
            </p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <Card className="border-border shadow-lg">
        <CardHeader className="border-b border-border">
          <CardTitle>Task Details</CardTitle>
          <CardDescription>
            All fields marked with * are required
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Task Title *
              </Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                disabled={isLoading}
                className={errors.title ? "border-destructive" : ""}
                maxLength={100}
              />
              {errors.title && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.title.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Enter task description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                disabled={isLoading}
                className={`min-h-[120px] resize-none ${
                  errors.description ? "border-destructive" : ""
                }`}
                maxLength={250}
              />
              {errors.description && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/250 characters
              </p>
            </div>

            {/* Two Column Layout for Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-medium">
                  Priority *
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    handleInputChange("priority", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span>High Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-status-inprogress" />
                        <span>Medium Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>Low Priority</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expected Closure */}
              <div className="space-y-2">
                <Label
                  htmlFor="expected_closure"
                  className="text-sm font-medium"
                >
                  Expected Closure Date *
                </Label>
                <div className="relative">
                  <Input
                    id="expected_closure"
                    type="date"
                    value={formData.expected_closure}
                    onChange={(e) =>
                      handleInputChange("expected_closure", e.target.value)
                    }
                    disabled={isLoading}
                    className={
                      errors.expected_closure ? "border-destructive" : ""
                    }
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {errors.expected_closure && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.expected_closure}
                  </p>
                )}
              </div>
            </div>

            {/* Assigned To & Reviewer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assigned To */}
              <div className="space-y-2">
                <Label htmlFor="assigned_to" className="text-sm font-medium">
                  Assign To
                </Label>
                <Select
                  value={formData.assigned_to?.toString() || "none"}
                  onValueChange={(value) =>
                    handleInputChange(
                      "assigned_to",
                      value === "none" ? undefined : parseInt(value)
                    )
                  }
                  disabled={isLoading || isLoadingEmployees}
                >
                  <SelectTrigger id="assigned_to">
                    <SelectValue placeholder="Select employee (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem
                        key={employee.e_id}
                        value={employee.e_id.toString()}
                      >
                        <div className="flex flex-col">
                          <span>{employee.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {employee.designation}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reviewer */}
              <div className="space-y-2">
                <Label htmlFor="reviewer" className="text-sm font-medium">
                  Reviewer
                </Label>
                <Select
                  value={formData.reviewer?.toString() || "none"}
                  onValueChange={(value) =>
                    handleInputChange(
                      "reviewer",
                      value === "none" ? undefined : parseInt(value)
                    )
                  }
                  disabled={isLoading || isLoadingEmployees}
                >
                  <SelectTrigger id="reviewer">
                    <SelectValue placeholder="Select reviewer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managers.map((employee) => (
                      <SelectItem
                        key={employee.e_id}
                        value={employee.e_id.toString()}
                      >
                        <div className="flex flex-col">
                          <span>{employee.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {employee.designation}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Task...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Create Task
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate("/dashboard")}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTask;
