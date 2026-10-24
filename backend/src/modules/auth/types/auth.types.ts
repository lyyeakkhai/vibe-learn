export interface JwtPayload {
  sub: string;
  email?: string;
  iss?: string;
  exp?: number;
  nbf?: number;
  [key: string]: any;
}
