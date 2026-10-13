const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");
const activityController = require("../controllers/activityController");
const checklistController = require("../controllers/checklistController");
const authMiddleware = require("../middleware/auth");


router.use(authMiddleware);


router.post("/", tripController.createTrip);
router.get("/", tripController.getUserTrips);
router.get("/:tripId", tripController.getTripById);
router.put("/:tripId", tripController.updateTrip);
router.delete("/:tripId", tripController.deleteTrip);


router.get("/:tripId/history", tripController.getTripHistory);


router.post("/:tripId/collaborators", tripController.inviteCollaborator);
router.get("/:tripId/collaborators", tripController.listCollaborators);
router.delete(
  "/:tripId/collaborators/:collaboratorId",
  tripController.removeCollaborator
);


router.post("/:tripId/activities", activityController.createActivity);
router.get("/:tripId/activities", activityController.getActivities);
router.put(
  "/:tripId/activities/:activityId",
  activityController.updateActivity
);
router.delete(
  "/:tripId/activities/:activityId",
  activityController.deleteActivity
);


router.post(
  "/:tripId/activities/:activityId/comments",
  activityController.addComment
);
router.get(
  "/:tripId/activities/:activityId/comments",
  activityController.getComments
);
router.delete(
  "/:tripId/activities/:activityId/comments/:commentId",
  activityController.deleteComment
);


router.post("/:tripId/checklist", checklistController.createChecklist);
router.get("/:tripId/checklist", checklistController.getChecklist);
router.post("/:tripId/checklist/items", checklistController.addChecklistItem);
router.patch(
  "/:tripId/checklist/items/:itemId",
  checklistController.toggleChecklistItem
);
router.delete(
  "/:tripId/checklist/items/:itemId",
  checklistController.deleteChecklistItem
);


router.get("/checklist/templates", checklistController.getTemplates);
router.post("/checklist/init-templates", checklistController.initializeTemplates);

module.exports = router;
