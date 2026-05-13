export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <div className="bg-white min-h-screen">
      <main className="flex min-h-screen">{children}</main>
    </div>
  );
}
