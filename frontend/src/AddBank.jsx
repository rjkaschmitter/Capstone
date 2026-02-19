import AddBank from "./AddBankComponent.jsx";
import Sidebar from "./sidebar.jsx"
import "./AddBank.css";

export default function AddBankPage() {
    return (
            <div className="bank-layout">
                <Sidebar />
                <div className="bank-content">
                    <header className="bank-header">
                        <h1>Add Bank Account</h1>
                    </header>
                    <div className="bank-grid">
                        <div className="bank-card">
                            <AddBank />
                        </div>
                    </div>
                </div>
            </div>
        );
    }