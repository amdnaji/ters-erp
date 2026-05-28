# Ters ERP | ترس المحاسبي

Ters ERP is a state-of-the-art, open-source Enterprise Resource Planning system specifically optimized for Small and Medium Enterprises (SMEs) with dynamic multi-tenancy (SaaS) and bilingual isolation (Arabic & English). 

نظام **ترس المحاسبي** هو نظام تخطيط موارد المؤسسات (ERP) حديث ومفتوح المصدر، مصمم خصيصاً للمنشآت الصغيرة والمتوسطة. يدعم النظام تعدد الشركات والمستأجرين (SaaS) بشكل معزول وآمن بالكامل، مع واجهات وتجربة مستخدم ممتازة تدعم اللغتين العربية والإنجليزية بشكل منفصل ونظيف.

---

## 🌟 Key Features | أبرز المميزات

### 1. General Ledger & Double-Entry Accounting | المحاسبة العامة والقيود اليومية
* **Chart of Accounts (دليل الحسابات الشجري):** A highly flexible dynamic tree structure to manage Assets, Liabilities, Equity, Revenues, and Expenses.
* **Double-Entry Journal Entries (القيود المحاسبية المزدوجة):** Record vouchers with real-time balance safety checks (Debits = Credits).
* **Bilingual Arabic/English Primary UI (لغة عربية أساسية ولغة إنجليزية ثانوية):** Fluid conversion without mixed-context brackets.

### 2. Multi-Tenant SaaS Isolation | عزل تام وآمن للمستأجرين (SaaS)
* Out-of-the-box tenant schema isolation. Each company operates in its own logical space with 100% separate accounting data.

### 3. Granular Permission Matrix (RBAC) | مصفوفة الصلاحيات والأمان
* Create custom roles (Accountant, Auditor, Cashier) and assign specific CRUD (Read, Create, Update, Delete) permissions per subsystem.
* Provision new user accounts and automatically hash passwords using ASP.NET Identity architecture.

### 4. Live Financial Statements | التقارير والقوائم المالية الفورية
* Real-time generation of **Income Statements (قائمة الدخل)**, **Balance Sheets (الميزانية العمومية)**, and **Trial Balance (ميزان المراجعة)** directly from active ledger posts.

---

## 💻 Tech Stack | التقنيات المستخدمة

* **Backend (الخلفية):** .NET 9.0 Core Web API, Entity Framework Core.
* **Database (قاعدة البيانات):** PostgreSQL.
* **Frontend (الواجهة):** React (TypeScript), Vite, Tailwind CSS / Vanilla CSS, Lucide Icons.
* **Security (الأمان):** Cookie authentication, Tenant-based isolation, Role-based claims mapping.

---

## 🚀 Setup & Installation | خطوات التشغيل والتنصيب

### Prerequisites | المتطلبات الأساسية
* [.NET 9.0 SDK](https://dotnet.microsoft.com/download)
* [Node.js (v18+)](https://nodejs.org/)
* [PostgreSQL Database Server](https://www.postgresql.org/)

### 1. Database Connection | إعداد قاعدة البيانات
Configure your connection string in [appsettings.json](file:///c:/dotnetproject/ters-erp/src/TersErp.Api/appsettings.json):
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=ters_erp;Username=postgres;Password=your_password"
}
```

### 2. Run the Backend | تشغيل النظام الخلفي
```bash
cd src/TersErp.Api
dotnet ef database update
dotnet run
```

### 3. Run the Frontend Client | تشغيل النظام الأمامي
```bash
cd src/terserp.client
npm install
npm run dev
```

## 📚 Documentation & Advanced Guides | المستندات والأدلة المتقدمة

* **[Custom Domain & Reverse Proxy Setup Guide (Option 2)](docs/reverse_proxy_setup.md)**: A complete step-by-step guide with ready-to-use IIS and Nginx scripts to bind your local Ters ERP service to a custom domain (e.g., `https://ters-erp.yourdomain.com`).
* **[دليل إعداد النطاق المخصص والخادم الوكيل العكسي](docs/reverse_proxy_setup.md)**: دليل إعداد خطوة بخطوة باللغة الإنجليزية مع السكربتات البرمجية الجاهزة لخوادم IIS و Nginx لربط خادم نظام ترس المحاسبي بنطاق مخصص لشركتك.

---

## 📄 License | الرخصة
This project is open-source under the **MIT License**.
جميع الحقوق مفتوحة ومتاحة للاستخدام والتطوير تحت رخصة **MIT**.

---

> Built with ❤️ in 🇸🇦 | بُني بحب ❤️ في 🇸🇦
