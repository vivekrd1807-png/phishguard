# 🛡️ PhishGuard – AI-Powered Phishing URL Detection

PhishGuard is a machine learning-based web application designed to detect phishing URLs and distinguish them from legitimate websites using multiple classification models.

## 🚀 Features

- **Phishing URL Detection:** Analyze URLs to identify potentially malicious websites.
- **Machine Learning Models:** Uses Random Forest and XGBoost classifiers.
- **Ensemble Prediction:** Combines predictions from multiple models for improved decision-making.
- **Interactive Dashboard:** User-friendly interface for URL analysis and prediction results.
- **Real-Time Analysis:** Submit URLs and receive prediction results through the web application.

## 🧠 Machine Learning Models

PhishGuard uses the following models:

- Random Forest
- XGBoost
- Ensemble Model

The ensemble combines model predictions to provide a final classification.

## 🛠️ Tech Stack

**Frontend**
- React.js
- JavaScript
- CSS

**Backend**
- Python
- Flask

**Machine Learning & Data Processing**
- Scikit-learn
- XGBoost
- Pandas
- NumPy
- Joblib

## 📂 Project Structure

```text
PhishGuard/
├── frontend/
│   ├── src/
│   └── package.json
│
├── backend/
│   ├── models/
│   ├── app.py
│   └── requirements.txt
│
├── .gitignore
└── README.md
```

*Note: Update this structure to match the actual repository.*

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/vivekrd1807-png/phishguard.git
cd phishguard
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

**Windows:**
```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the Flask backend using the appropriate entry point:

```bash
python app.py
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

## 🔍 How It Works

1. User enters a website URL.
2. The application processes the URL.
3. Machine learning models analyze its features.
4. Random Forest and XGBoost generate predictions.
5. The ensemble model combines predictions.
6. The dashboard displays the classification result.

## 🔐 Security Note

PhishGuard is a detection-support tool and should not be treated as a guarantee that a website is safe. Avoid visiting suspicious URLs directly.

## 👨‍💻 Author

**Vivek Kamble**

GitHub: [vivekrd1807-png](https://github.com/vivekrd1807-png)

## 📜 License

This project is developed for educational and research purposes.
