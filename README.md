# ClaimGuard

ClaimGuard is a smart healthcare claims management system that helps insurance and healthcare companies handle claim denials more efficiently. It uses artificial intelligence to automatically analyze denied claims, suggest appeal strategies, and provide insights into denial patterns.

## What's Inside

### Backend (The Engine)
Located in the `/backend` folder, this is where the core logic lives:
- **Claims Processing**: Stores and manages all insurance claims
- **Smart Analysis**: Uses AI to understand why claims were denied
- **Appeal Suggestions**: Automatically drafts appeals for denied claims
- **Reports & Insights**: Creates reports on denial trends and patterns
- **Data Storage**: Safely stores all claim information in a database
- **Integrations**: Connects with email and other external services

### Frontend (The Interface)
Located in the `/frontend` folder, this is the user-friendly dashboard where users can:
- View all claims at a glance
- See which claims need action
- Read AI-suggested appeals
- Upload new claim documents
- View charts and reports about denials
- Track appeal progress

## Getting Started

### What You Need
- Python 3.10 or newer
- Node.js version 18 or newer
- Docker (optional - only if you want to run everything in containers)

### Setting Up the Backend (The Engine)

1. Open a terminal and go to the backend folder:
```bash
cd backend
```

2. Create an isolated Python environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install required packages:
```bash
pip install -r requirements.txt
```

4. Set up the database:
```bash
python seed.py
```

5. Start the backend:
```bash
python -m uvicorn app.main:app --reload
```

The backend will be running at `http://localhost:8000`

### Setting Up the Frontend (The Dashboard)

1. Open a new terminal and go to the frontend folder:
```bash
cd frontend
```

2. Install required packages:
```bash
npm install
```

3. Start the dashboard:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## Configuration

### Backend Settings
Create a file called `.env` in the backend folder with:
```
DATABASE_URL=sqlite:///./claimguard.db
OPENAI_API_KEY=your_api_key
AGENTMAIL_API_KEY=your_api_key
```

### Frontend Settings
Create a file called `.env.local` in the frontend folder with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testing

### Testing the Backend
To make sure everything is working correctly:
```bash
cd backend
pytest
```

Run specific tests:
```bash
pytest tests/test_api.py        # Test the API endpoints
pytest tests/test_pipeline.py   # Test the AI analysis engine
pytest tests/test_webhooks.py   # Test external integrations
```

### Testing the Frontend
```bash
cd frontend
npm run test
```

## How Data is Organized

The system stores information in a database with the following main categories:
- **Claims** - All the insurance claims
- **Denials** - Information about why claims were denied
- **Appeals** - Appeals that have been drafted or submitted
- **Reports** - Summary statistics and insights

## API Reference

If you're a developer, you can explore all the available functions at:
- Interactive Documentation: `http://localhost:8000/docs`
- Alternative Format: `http://localhost:8000/redoc`

(These links only work when the backend is running)

## Key Features

- **Automatic Analysis**: AI reads and understands denied claims
- **Smart Appeals**: Generates professional appeal letters automatically
- **Insights Dashboard**: Shows trends and patterns in denials
- **External Integrations**: Works with email and other services
- **Easy to Use**: Simple web interface for all users

## How It Works (Technical Details)

### Backend Technology
- **FastAPI**: Framework that powers the API
- **LangGraph**: Tool for managing AI workflows
- **SQLAlchemy**: System for storing data safely
- **Pydantic**: Ensures data quality

### Frontend Technology
- **Next.js**: React framework for building the dashboard
- **TypeScript**: Helps catch errors before they happen
- **shadcn/ui**: Pre-made components for the interface
- **Tailwind CSS**: System for styling the interface

## Running Everything with Docker

If you have Docker installed, you can run the entire system with one command:
```bash
docker-compose up
```

This automatically starts both the backend and frontend.

## Getting Involved

Want to help improve ClaimGuard? Here's how:

1. Create a new branch for your work
2. Make your changes
3. Run the tests to make sure everything still works
4. Submit your changes for review

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Need Help?

For questions, issues, or ideas, please reach out to the development team.
