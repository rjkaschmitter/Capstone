import Budget from "./BudgetComponents.jsx";
import Sidebar from "./sidebar.jsx";
import "./Budget.css";

export default function BudgetPage() {
    return (
        <div className="budget-layout">
            <Sidebar />
            <div className="budget-content">
                <header className="budget-header">
                    <h1>Budget Management</h1>
                </header>
                <div className="budget-grid">
                    <div className="budget-card">
                        <Budget />
                    </div>
                </div>
            </div>
        </div>
    );
}