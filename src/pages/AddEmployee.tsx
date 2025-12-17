import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { employeeService, userService, Employee } from "@/services";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface FormState {
  name: string;
  email: string;
  designation: string;
  mgr_id?: number;
}

const AddEmployee: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    designation: "",
    mgr_id: undefined,
  });
  const [managers, setManagers] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // fetch all users with Manager role to populate mgr selector
    const loadManagers = async () => {
      try {
        const users = await userService.getUsersByRole("Manager");
        // try to resolve employee details for display
        const backendRole = currentRole === "admin" ? "Admin" : "Manager";
        const detailed = await Promise.all(
          users.map(async (u: any) => {
            try {
              const emp = await employeeService.getEmployeeById(
                u.e_id,
                backendRole
              );
              return emp as Employee;
            } catch (e) {
              return {
                e_id: u.e_id,
                name: `Manager ${u.e_id}`,
                email: "",
                designation: "Manager",
              } as Employee;
            }
          })
        );
        setManagers(detailed);
      } catch (e) {
        console.error("Failed to load managers", e);
      }
    };
    loadManagers();
  }, [currentRole]);

  const handleChange = (k: keyof FormState, v: any) =>
    setForm((s) => ({ ...s, [k]: v }));

  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (!form.email.trim()) return "Email is required";
    if (!/^[\w.+-]+@ust\.com$/i.test(form.email))
      return "Email must end with @ust.com";
    if (!form.designation.trim()) return "Designation is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: "Validation", description: err, variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const backendRole = currentRole === "admin" ? "Admin" : undefined;
      await employeeService.createEmployee(
        {
          name: form.name.trim(),
          email: form.email.trim(),
          designation: form.designation.trim(),
          mgr_id: form.mgr_id,
        },
        backendRole
      );
      toast({
        title: "Success",
        description: "Employee added",
        variant: "default",
      });
      navigate("/employees");
    } catch (err: any) {
      console.error("Failed to create employee", err);
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to create employee",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Add Employee</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a new employee</CardTitle>
          <CardDescription>
            Provide employee details and assign a manager
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div>
              <Label>Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) => handleChange("designation", e.target.value)}
              />
            </div>
            <div>
              <Label>Reports To (Manager)</Label>
              <Select
                value={form.mgr_id?.toString() || "none"}
                onValueChange={(v) =>
                  handleChange("mgr_id", v === "none" ? undefined : parseInt(v))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.e_id} value={m.e_id.toString()}>
                      {m.name} - {m.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Employee"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/employees")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddEmployee;
