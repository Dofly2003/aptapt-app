import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

function DashboardLayout() {

    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (

        <div className="flex h-safe-screen bg-gray-100">

            {/* SIDEBAR DESKTOP */}

            <div className="hidden md:flex md:w-64">

                <Sidebar />

            </div>


            {/* SIDEBAR MOBILE */}

            {sidebarOpen && (

                <div className="fixed inset-0 z-40 md:hidden">

                    {/* BACKDROP */}

                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setSidebarOpen(false)}
                    />

                    {/* DRAWER */}

                    <div className="relative w-64 h-full bg-slate-900">

                        <Sidebar closeSidebar={() => setSidebarOpen(false)} />

                    </div>

                </div>

            )}


            {/* MAIN CONTENT */}

            <div className="flex flex-col flex-1">

                <Navbar openSidebar={() => setSidebarOpen(true)} />

                <main className="flex-1 overflow-y-auto p-4 md:p-6">

                    <div className="max-w-7xl mx-auto">

                        <Outlet />

                    </div>

                </main>

            </div>

        </div>

    );

}

export default DashboardLayout;