export const passwordRequirements = [
  {
    id: "length",
    label: "Ít nhất 12 ký tự",
    test: (password: string) => password.length >= 12,
  },
  {
    id: "lowercase",
    label: "Có chữ thường",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: "uppercase",
    label: "Có chữ hoa",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: "number",
    label: "Có số",
    test: (password: string) => /\d/.test(password),
  },
  {
    id: "symbol",
    label: "Có ký tự đặc biệt",
    test: (password: string) => /[^A-Za-z0-9\s]/.test(password),
  },
  {
    id: "space",
    label: "Không có khoảng trắng",
    test: (password: string) => !/\s/.test(password),
  },
];

export function getPasswordPolicyIssues(password: string) {
  return passwordRequirements.filter((requirement) => !requirement.test(password));
}

export function isStrongPassword(password: string) {
  return getPasswordPolicyIssues(password).length === 0;
}
