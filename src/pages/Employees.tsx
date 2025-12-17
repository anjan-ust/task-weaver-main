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
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchQuery.toLowerCase())
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

  const roleColors: Record<string, string> = {
    admin: "bg-destructive/10 text-destructive",
    manager: "bg-status-inprogress/10 text-status-inprogress",
    developer: "bg-primary/10 text-primary",
  };

  return (
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
                              {employee.name
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
                          <Button variant="ghost" size="sm">
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
    </div>
  );
};

export default Employees;
