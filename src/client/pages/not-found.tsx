import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";

export const NotFoundPage: React.FC<{ onGoHome: () => void }> = ({ onGoHome }) => {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle>Page Not Found</CardTitle>
          <CardDescription>
            The requested page does not exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button onClick={onGoHome}>Return to Dashboard</Button>
        </CardFooter>
      </Card>
    </div>
  );
};
