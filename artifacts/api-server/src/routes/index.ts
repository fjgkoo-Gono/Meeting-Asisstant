import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import meetingsRouter from "./meetings";
import materialsRouter from "./materials";
import chatRouter from "./chat";
import searchRouter from "./search";
import timelineRouter from "./timeline";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(meetingsRouter);
router.use(materialsRouter);
router.use(chatRouter);
router.use(searchRouter);
router.use(timelineRouter);

export default router;
