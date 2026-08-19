import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import meetingsRouter from "./meetings";
import materialsRouter from "./materials";
import chatRouter from "./chat";
import searchRouter from "./search";
import timelineRouter from "./timeline";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(meetingsRouter);
router.use(materialsRouter);
router.use(chatRouter);
router.use(searchRouter);
router.use(timelineRouter);
router.use(tasksRouter);

export default router;
