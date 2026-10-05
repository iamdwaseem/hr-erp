import React, { useState } from "react";
import { EmployeeList } from "./employee-list";
import { EmployeeProfile } from "./employee-profile";

export const EmployeesPage: React.FC = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  if (selectedEmployeeId) {
    return (
      <EmployeeProfile
        employeeId={selectedEmployeeId}
        onBack={() => setSelectedEmployeeId(null)}
      />
    );
  }

  return <EmployeeList onSelectEmployee={(id) => setSelectedEmployeeId(id)} />;
};
