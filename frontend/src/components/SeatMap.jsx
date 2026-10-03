export default function SeatMap({ seats, selected, onToggle }) {
  return (
    <>
      <div className="seatmap">
        {seats.map((seat) => {
          const genderClass = seat.gender === 'M' ? 'male' : seat.gender === 'F' ? 'female' : seat.gender ? 'other' : '';
          const genderLabel = seat.gender === 'M' ? 'male passenger' : seat.gender === 'F' ? 'female passenger' : seat.gender ? 'other passenger' : 'passenger gender unavailable';
          const booked = seat.status === 'Booked';
          return (
            <div
              key={seat.seat_number}
              className={`seat ${booked ? `booked ${genderClass}` : selected.includes(seat.seat_number) ? 'sel' : 'avail'}`}
              title={booked ? `Booked for ${genderLabel}` : undefined}
              aria-label={`Seat ${seat.seat_number}${booked ? `, booked for ${genderLabel}` : ''}`}
              onClick={() => !booked && onToggle(seat.seat_number)}
            >
              {seat.seat_number}
            </div>
          );
        })}
      </div>
      <div className="seat-legend">
        <span><i className="seat-key selected" />Selected</span>
        <span><i className="seat-key available" />Available</span>
        <span><i className="seat-key booked-male" />Male</span>
        <span><i className="seat-key booked-female" />Female</span>
        <span><i className="seat-key booked-other" />Other / unknown</span>
      </div>
    </>
  );
}
