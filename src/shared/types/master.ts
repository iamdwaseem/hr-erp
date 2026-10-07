export interface Department {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  country?: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTypeMaster {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
