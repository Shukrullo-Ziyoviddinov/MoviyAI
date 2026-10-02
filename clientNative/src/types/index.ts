export type ApiError = {
  message: string;
  status?: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
};
