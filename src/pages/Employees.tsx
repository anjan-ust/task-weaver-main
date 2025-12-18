import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { employeeService } from "@/services/employeeService";
import { userService } from "@/services/userService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Mail, Building } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Employees: React.FC = () => {
  const { currentRole } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    designation: "",
    mgr_id: "none",
  });
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const backendRoleMap: { [k: string]: string } = {
          admin: "Admin",
          manager: "Manager",
          developer: "Developer",
        };
        const backendRole = backendRoleMap[currentRole] || "Developer";
        const resp = await employeeService.getEmployees(1, 1000, backendRole);
        // Only fetch the users list when calling as Admin — other roles will be denied by the backend
        let allUsers: any[] = [];
        if (backendRole === "Admin") {
          allUsers = await userService.getUsers(backendRole);
        }
        if (!mounted) return;
        setEmployees(
          resp.data.map((e) => ({
            id: String(e.e_id),
            name: e.name,
            email: e.email,
            designation: e.designation,
            managerId: e.mgr_id ? String(e.mgr_id) : undefined,
          }))
        );
        setUsers(
          allUsers.map((u) => ({
            id: String(u.e_id),
            roles: Array.isArray(u.roles)
              ? u.roles.map((r: any) => String(r).toLowerCase())
              : [String(u.role || "").toLowerCase()],
          }))
        );
        // If admin, fetch list of managers and map to employee names
        if (backendRole === "Admin") {
          try {
            const mgrUsers = await userService.getUsersByRole("Manager");
            // build map of employee id -> name
            const empMap: Record<number, string> = {};
            (resp.data || []).forEach((ee: any) => {
              empMap[ee.e_id] = ee.name;
            });
            const mgrs = mgrUsers.map((u: any) => ({
              id: String(u.e_id),
              name: empMap[u.e_id] || `Manager ${u.e_id}`,
            }));
            setManagers(mgrs);
          } catch (err) {
            console.error("Failed to load managers for dropdown", err);
            setManagers([]);
          }
        }
      } catch (err) {
        console.error("Error loading employees/users", err);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [currentRole]);

  const filteredEmployees = employees.filter(
    (emp) =>
      (emp.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.designation || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEmployeeRoles = (employeeId: string) => {
    const user = users.find((u) => u.id === employeeId);
    return user?.roles || [];
  };

  const getManagerName = (managerId?: string) => {
    if (!managerId) return "-";
    const manager = employees.find((e) => e.id === managerId);
    return manager?.name || "-";
  };

  const openEdit = async (employeeId: string) => {
    // Only admin should be able to edit
    if (currentRole !== "admin") return;
    const backendRoleMap: { [k: string]: string } = {
      admin: "Admin",
      manager: "Manager",
      developer: "Developer",
    };
    const backendRole = backendRoleMap[currentRole] || "Developer";
    try {
      const e = await employeeService.getEmployeeById(
        Number(employeeId),
        backendRole
      );
      // debug: log fetched employee for visibility
      // eslint-disable-next-line no-console
      console.debug("Fetched employee for edit:", e);
      setEditingEmployeeId(String(e.e_id));
      setForm({
        name: e.name || "",
        email: e.email || "",
        designation: e.designation || "",
        mgr_id: e.mgr_id ? String(e.mgr_id) : "none",
      });
      setIsEditOpen(true);
    } catch (err: any) {
      console.error("Error fetching employee for edit", err);
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to load employee";
      toast({ title: message });
    }
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingEmployeeId(null);
    // reset form to defaults
    setForm({ name: "", email: "", designation: "", mgr_id: "none" });
  };

  const saveEdit = async () => {
    if (!editingEmployeeId) return;
    const backendRoleMap: { [k: string]: string } = {
      admin: "Admin",
      manager: "Manager",
      developer: "Developer",
    };
    const backendRole = backendRoleMap[currentRole] || "Developer";

    const payload: any = {
      name: form.name,
      email: form.email,
      designation: form.designation,
    };
    if (form.mgr_id && form.mgr_id !== "none") {
      payload.mgr_id = Number(form.mgr_id);
    }

    try {
      await employeeService.updateEmployee(
        Number(editingEmployeeId),
        payload,
        backendRole
      );
      setEmployees((prev) =>
        prev.map((p) =>
          p.id === editingEmployeeId
            ? {
                ...p,
                name: payload.name,
                email: payload.email,
                designation: payload.designation,
                managerId: payload.mgr_id ? String(payload.mgr_id) : undefined,
              }
            : p
        )
      );
      toast({ title: "Employee updated" });
      closeEdit();
    } catch (err: any) {
      console.error("Error updating employee", err);
      const message =
        err?.response?.data?.detail || "Failed to update employee";
      toast({ title: message });
    }
  };

  const roleColors: Record<string, string> = {
    admin: "bg-destructive/10 text-destructive",
    manager: "bg-status-inprogress/10 text-status-inprogress",
    developer: "bg-primary/10 text-primary",
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-muted-foreground">
              Manage your team members ({employees.length} total)
            </p>
          </div>
          {currentRole === "admin" && (
            <Button
              variant="gradient"
              className="gap-2"
              onClick={() => navigate("/employees/add")}
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          )}
        </div>

        {/* Search */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Reports To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee, index) => {
                    const roles = getEmployeeRoles(employee.id);
                    return (
                      <TableRow
                        key={employee.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {(employee.name || "")
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {employee.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            {employee.designation}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {roles.map((role) => (
                              <Badge
                                key={role}
                                variant="secondary"
                                className={roleColors[role]}
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {getManagerName(employee.managerId)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                          {currentRole === "admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(employee.id)}
                            >
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No employees found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit dialog for Admin */}
        <Dialog open={isEditOpen} onOpenChange={(open) => setIsEditOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <div className="grid grid-cols-1 gap-1">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-1">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-1">
                <Label>Designation</Label>
                <Input
                  value={form.designation}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, designation: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-1">
                <Label>Manager</Label>
                <Select
                  value={form.mgr_id}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, mgr_id: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {form.mgr_id && form.mgr_id !== "none"
                        ? managers.find((m) => m.id === form.mgr_id)?.name ||
                          form.mgr_id
                        : "None"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <div className="flex gap-2 justify-end w-full">
                <Button variant="ghost" onClick={closeEdit}>
                  Cancel
                </Button>
                <Button onClick={saveEdit}>Save</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};

export default Employees;
