// Program type definitions — list item, create/update inputs, action results

export type ProgramListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isDeleted: boolean;
  _count: {
    courses: number;
    users: number;
  };
};

export type CreateProgramInput = {
  name: string;
  slug: string;
  description?: string;
};

export type UpdateProgramInput = Partial<CreateProgramInput>;

export type ProgramActionResult<T = ProgramListItem> =
  | { success: true; data: T }
  | { success: false; error: string };
