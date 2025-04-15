import {NextFunction, Request, Response} from "express"

const sessionMiddleware = (
    request: Request, 
    response: Response, 
    next: NextFunction
) =>{
    //@ts-ignore
    if(request.session.userID !== undefined){
        //@ts-ignore
        response.locals.userId = request.session.userId;
        next();
    }else{
        response.redirect("/auth/login");
    }
}

export {sessionMiddleware};