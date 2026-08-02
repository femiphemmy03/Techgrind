import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Waitlist() {
  const [cohort, setCohort] = useState(null);

  useEffect(() => {
    api.get('/public/cohort').then(({ data }) => setCohort(data.cohort));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-5 py-24 text-center">
      <h1 className="font-display text-3xl font-bold mb-4">Classes are currently in session</h1>
      <p className="text-muted mb-8 leading-relaxed">
        {cohort ? (
          <>
            <strong className="text-offwhite">{cohort.name}</strong> is already underway, so jumping in now means
            missing foundational weeks. The best move is to wait for the next cohort and start fresh with everyone else.
          </>
        ) : (
          'The current cohort is already underway. Check back soon for the next cohort\'s registration dates.'
        )}
      </p>
      <div className="flex gap-4 justify-center flex-wrap">
        <Link to="/" className="btn-secondary">Back to Home</Link>
        <Link to="/contact" className="btn-primary">Ask a Question</Link>
      </div>
    </div>
  );
}
