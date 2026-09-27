const City = require('../models/cityModel');
const { logAudit } = require('../utils/audit');
const { isCityName, normalizeText } = require('../utils/validation');

exports.getAllCity = (req, res) => {
  City.getallcity((err, results) => {
    if (err) return res.status(500).send({ error: err });
    res.json(results);
  });
};

exports.getCityByID = (req, res) => {
  City.getcitybyID(req.params.id, (err, results) => {
    if (err) return res.status(500).send({ error: err });
    if (results.length === 0) return res.status(404).send({ message: 'City not found' });
    res.json(results[0]);
  });
};

exports.createCity = (req, res) => {
  const name = normalizeText(req.body.name);
  if (!isCityName(name)) return res.status(400).send({ message: 'City name must contain letters and spaces only' });

  City.createcity({ name }, (err, result) => {
    if (err) return res.status(500).send({ error: err });

    if (!result.success && result.reason === 'DUPLICATE') {
      return res.status(400).send({ message: 'City with this name already exists' });
    }

    logAudit(req.user.id, req.user.name, 'City Creation', 'City', result.insertedId, name);
    res.status(201).send({ message: 'City created successfully', cityId: result.insertedId });
  });
};

exports.updateCity = (req, res) => {
  const name = normalizeText(req.body.name);
  if (!isCityName(name)) return res.status(400).send({ message: 'City name must contain letters and spaces only' });

  City.updatecity(req.params.id, { ...req.body, name }, (err, result) => {
    if (err) return res.status(500).send({ error: err });

    if (!result.success && result.reason === 'DUPLICATE') {
      return res.status(400).send({ message: 'City with this name already exists' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).send({ message: 'City not found' });
    }

    logAudit(req.user.id, req.user.name, 'City Update', 'City', req.params.id, JSON.stringify(req.body));
    res.send({ message: 'City updated successfully' });
  });
};

exports.deleteCity = (req, res) => {
  City.deletecity(req.params.id, (err, result) => {
    if (err) return res.status(500).send({ error: err });

    if (!result.success) {
      if (result.reason === 'IN_USE') {
        return res.status(400).send({ message: "City can't be deleted — it still has terminals assigned" });
      }
      return res.status(400).send({ message: 'Unknown deletion error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).send({ message: 'City not found' });
    }

    logAudit(req.user.id, req.user.name, 'City Deletion', 'City', req.params.id, '');
    res.send({ message: 'City deleted successfully' });
  });
};
