import React from "react";
import { Hammer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/card";

interface ModulePlaceholderProps {
  title: string;
  description: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description,
}) => {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="max-w-lg text-center border-dashed">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Hammer className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-sm mt-2">{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
