import Sidebar from "./Sidebar";

const DashboardLayout = ({ navItems, children }) => {
  return (
    <div className="flex h-screen">
      <Sidebar navItems={navItems} />
      <main className="flex-grow p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
