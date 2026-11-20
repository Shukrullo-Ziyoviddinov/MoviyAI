export type AuthProfile = {
  id: string;
  googleId: string;
  email: string;
  telegramId?: string;
  telegramUsername?: string;
  name: string;
  picture: string;
  searchGuideUnderstood?: boolean;
  chatGuideUnderstood?: boolean;
};
