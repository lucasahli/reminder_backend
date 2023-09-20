import {GraphQlContext} from "../../../main.js";
import {
  GetUsersByLoginUseCaseHandler, SignInUseCaseHandler,
  SignUpUseCaseHandler
} from "../../../core/components/reminderContext/application/useCases/index.js";
import {GetUsersByLoginUseCase, SignInUseCase, SignUpUseCase} from "../../../core/portsAndInterfaces/ports/index.js";

/** When setting up a field whose value is a custom type,
 * we have to define a function that tells GraphQL how to get that custom type.
 * For example: The User type has a reminders field.
 * We do that by defining a new root property inside resolvers.
 */

export default {
  Login: {
    users: async (parent: any, args: any, context: GraphQlContext) => {
      const getUsersByLoginUseCase: GetUsersByLoginUseCase = new GetUsersByLoginUseCaseHandler(context.accountService);
      return getUsersByLoginUseCase.execute(context.viewer, parent.id);
    },
  },

  Mutation: {
    signUp: async (parent: any, args: any, context: GraphQlContext) => {
      const signUpUseCase: SignUpUseCase = new SignUpUseCaseHandler(context.accountService);
      return signUpUseCase.execute(context.viewer, args.email, args.password, args.fullName);
    },
    signIn: async (parent: any, args: any, context: GraphQlContext) => {
      const signInUseCase: SignInUseCase = new SignInUseCaseHandler(context.accountService);
      return signInUseCase.execute(context.viewer, args.email, args.password);
      },
  },
};
