import React from "react";
import type { ProfileTabType } from "../employees/employee-profile";
import { ActionCenterView } from "./action-center-view";

interface ActionCenterPageProps {
  onViewEmployee?: (employeeId: string, initialTab?: ProfileTabType) => void;
}

export const ActionCenterPage: React.FC<ActionCenterPageProps> = ({
  onViewEmployee,
}) => {
  return (
    <div className="space-y-6">
      <ActionCenterView onViewEmployee={onViewEmployee} />
    </div>
  );
};
