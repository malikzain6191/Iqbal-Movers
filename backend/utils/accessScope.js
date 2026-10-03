exports.scheduleScope = (user, alias = 's') => {
  if (user?.role === 'super_admin') return { sql: '1 = 1', params: [] };
  if (user?.role === 'counter_operator' && user.terminal_id) {
    return { sql: `${alias}.departure_terminal_id = ?`, params: [user.terminal_id] };
  }
  if (user?.role === 'city_admin' && user.city_id) {
    return {
      sql: `${alias}.departure_terminal_id IN (SELECT id FROM terminals WHERE city_id = ?)`,
      params: [user.city_id]
    };
  }
  return { sql: '1 = 0', params: [] };
};

exports.routeScope = (user, alias = 'r') => {
  if (user?.role === 'super_admin') return { sql: '1 = 1', params: [] };
  if (user?.role === 'counter_operator' && user.terminal_id) {
    return { sql: `${alias}.origin_terminal_id = ?`, params: [user.terminal_id] };
  }
  if (user?.role === 'city_admin' && user.city_id) {
    return {
      sql: `${alias}.origin_terminal_id IN (SELECT id FROM terminals WHERE city_id = ?)`,
      params: [user.city_id]
    };
  }
  return { sql: '1 = 0', params: [] };
};

exports.cityScope = (user, alias = 'c') => {
  if (user?.role === 'super_admin') return { sql: '1 = 1', params: [] };
  if (user?.city_id) return { sql: `${alias}.id = ?`, params: [user.city_id] };
  return { sql: '1 = 0', params: [] };
};

exports.terminalScope = (user, alias = 't') => {
  if (user?.role === 'super_admin') return { sql: '1 = 1', params: [] };
  if (user?.role === 'counter_operator' && user.terminal_id) {
    return { sql: `${alias}.id = ?`, params: [user.terminal_id] };
  }
  if (user?.role === 'city_admin' && user.city_id) {
    return { sql: `${alias}.city_id = ?`, params: [user.city_id] };
  }
  return { sql: '1 = 0', params: [] };
};

exports.vehicleScope = (user, alias = 'v') => {
  if (user?.role === 'super_admin') return { sql: '1 = 1', params: [] };
  if (user?.role === 'city_admin' && user.city_id) {
    const schedule = exports.scheduleScope(user, 'scoped_schedule');
    return {
      sql: `(${alias}.city_id = ? OR ${alias}.id IN (
        SELECT scoped_schedule.vehicle_id FROM schedules scoped_schedule WHERE ${schedule.sql}
      ))`,
      params: [user.city_id, ...schedule.params]
    };
  }
  if (user?.role === 'counter_operator' && user.terminal_id) {
    return {
      sql: `(${alias}.home_terminal_id = ? OR ${alias}.id IN (
        SELECT scoped_schedule.vehicle_id FROM schedules scoped_schedule
        WHERE scoped_schedule.status <> 'Cancelled'
          AND (scoped_schedule.departure_terminal_id = ? OR scoped_schedule.arrival_terminal_id = ?)
      ))`,
      params: [user.terminal_id, user.terminal_id, user.terminal_id]
    };
  }
  const schedule = exports.scheduleScope(user, 'scoped_schedule');
  return {
    sql: `${alias}.id IN (SELECT scoped_schedule.vehicle_id FROM schedules scoped_schedule WHERE ${schedule.sql})`,
    params: schedule.params
  };
};

exports.driverScope = (user, alias = 'd') => {
  if (user?.role === 'super_admin') return { sql: '1 = 1', params: [] };
  if (user?.role === 'city_admin' && user.city_id) {
    return { sql: `${alias}.city_id = ?`, params: [user.city_id] };
  }
  if (user?.role === 'counter_operator' && user.terminal_id) {
    return {
      sql: `(${alias}.home_terminal_id = ? OR ${alias}.id IN (
        SELECT scoped_schedule.driver_id FROM schedules scoped_schedule
        WHERE scoped_schedule.status <> 'Cancelled'
          AND (scoped_schedule.departure_terminal_id = ? OR scoped_schedule.arrival_terminal_id = ?)
      ))`,
      params: [user.terminal_id, user.terminal_id, user.terminal_id]
    };
  }
  const schedule = exports.scheduleScope(user, 'scoped_schedule');
  return {
    sql: `${alias}.id IN (SELECT scoped_schedule.driver_id FROM schedules scoped_schedule WHERE ${schedule.sql})`,
    params: schedule.params
  };
};

exports.userScope = (user, alias = 'u') => {
  if (user?.role === 'super_admin') return { sql: '1 = 1', params: [] };
  if (user?.role === 'counter_operator') {
    return { sql: `${alias}.id = ?`, params: [user.id] };
  }
  if (user?.role === 'city_admin' && user.city_id) {
    return { sql: `${alias}.city_id = ?`, params: [user.city_id] };
  }
  return { sql: '1 = 0', params: [] };
};

exports.bookingScope = (user, bookingAlias = 'b', scheduleAlias = 's') => {
  const schedule = exports.scheduleScope(user, scheduleAlias);
  if (user?.role === 'counter_operator') {
    return {
      sql: `${schedule.sql} AND ${bookingAlias}.counter_user_id = ? AND ${bookingAlias}.terminal_id = ?`,
      params: [...schedule.params, user.id, user.terminal_id || 0]
    };
  }
  return schedule;
};