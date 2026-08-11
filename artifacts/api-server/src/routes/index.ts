import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import meetingsRouter from "./meetings";
import materialsRouter from "./materials";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(meetingsRouter);
router.use(materialsRouter);
router.use(chatRouter);

export default router;
