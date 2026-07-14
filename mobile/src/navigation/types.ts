export type AuthStackParamList = {
  Welcome: undefined;
  AdminLogin: undefined;
  ParentLogin: undefined;
};

export type AdminStackParamList = {
  StudentsList: undefined;
  StudentDetail: { studentId: number };
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Groups: undefined;
  Teachers: undefined;
  Analytics: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Students: undefined;
  Calendar: undefined;
  Finances: undefined;
  More: undefined;
};

export type ParentTabParamList = {
  Accueil: undefined;
  Cours: undefined;
  Presence: undefined;
  Notes: undefined;
  Paiements: undefined;
};
