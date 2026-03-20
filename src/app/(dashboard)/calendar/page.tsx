import EventCalendar from "@/components/EventCalendar";

const CalendarPage = () => {
  return (
    <div className="p-4 flex justify-center">
      <div className="w-full max-w-lg">
        <EventCalendar />
      </div>
    </div>
  );
};

export default CalendarPage;
