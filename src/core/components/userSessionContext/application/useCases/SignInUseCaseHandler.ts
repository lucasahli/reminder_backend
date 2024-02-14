import {SignInUseCase} from "../../../../portsAndInterfaces/ports/index.js";
import {Viewer} from "../../../../sharedKernel/index.js";
import {SignInResult} from "../../../../portsAndInterfaces/ports/SignInUseCase.js";
import {AccountService} from "../services/index.js";

export class SignInUseCaseHandler implements SignInUseCase {
    constructor(private accountService: AccountService) {
    }

    execute(viewer: Viewer, email: string, password: string): Promise<SignInResult> {
        return this.accountService.signIn(viewer, email, password);
    }
}