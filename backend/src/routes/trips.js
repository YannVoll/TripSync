const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");
const activityController = require("../controllers/activityController");
const checklistController = require("../controllers/checklistController");
const authMiddleware = require("../middleware/auth");
const { canReadTrip, canEditTrip, ownsTrip } = require("../lib/tripAccess");

router.use(authMiddleware);

router.get("/checklist/templates", checklistController.getTemplates);

router.post("/", tripController.createTrip);
router.get("/", tripController.getUserTrips);
router.get("/:tripId", canReadTrip, tripController.getTripById);
router.put("/:tripId", ownsTrip, tripController.updateTrip);
router.delete("/:tripId", ownsTrip, tripController.deleteTrip);

router.get("/:tripId/history", canReadTrip, tripController.getTripHistory);

router.post("/:tripId/collaborators", ownsTrip, tripController.inviteCollaborator);
router.get("/:tripId/collaborators", canReadTrip, tripController.listCollaborators);
router.delete(
  "/:tripId/collaborators/:collaboratorId",
  canReadTrip,
  tripController.removeCollaborator
);

router.post("/:tripId/activities", canEditTrip, activityController.createActivity);
router.get("/:tripId/activities", canReadTrip, activityController.getActivities);
router.put("/:tripId/activities/:activityId", canEditTrip, activityController.updateActivity);
router.delete("/:tripId/activities/:activityId", canEditTrip, activityController.deleteActivity);

router.post("/:tripId/activities/:activityId/comments", canEditTrip, activityController.addComment);
router.get("/:tripId/activities/:activityId/comments", canReadTrip, activityController.getComments);
router.delete(
  "/:tripId/activities/:activityId/comments/:commentId",
  canReadTrip,
  activityController.deleteComment
);

router.post("/:tripId/checklist", canEditTrip, checklistController.createChecklist);
router.get("/:tripId/checklist", canReadTrip, checklistController.getChecklist);
router.post("/:tripId/checklist/items", canEditTrip, checklistController.addChecklistItem);
router.patch("/:tripId/checklist/items/:itemId", canEditTrip, checklistController.toggleChecklistItem);
router.delete("/:tripId/checklist/items/:itemId", canEditTrip, checklistController.deleteChecklistItem);

module.exports = router;
