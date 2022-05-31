import React, { Fragment } from 'react';
import { PropTypes } from 'prop-types';
import { gql } from '@apollo/client';
import { graphql } from '@apollo/client/react/hoc';
import { Field, Form, Formik } from 'formik';
import { pick } from 'lodash';
import { withRouter } from 'next/router';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import { isEmail } from 'validator';

import { signin } from '../lib/api';
import { getWebsiteUrl } from '../lib/utils';

import Container from './Container';
import CreateProfileV2 from './CreateProfileV2';
import { Box, Flex } from './Grid';
import { I18nSupportLink } from './I18nFormatters';
import Loading from './Loading';
import SignInV2, { SignInFooterLink } from './SignInV2';
import StyledButton from './StyledButton';
import StyledCard from './StyledCard';
import StyledHr from './StyledHr';
import StyledInput from './StyledInput';
import StyledInputField from './StyledInputField';
import { H5, P, Span } from './Text';
import { TOAST_TYPE, withToasts } from './ToastProvider';

const messages = defineMessages({
  twoFactorAuthCodeInputLabel: {
    id: 'TwoFactorAuth.Setup.Form.InputLabel',
    defaultMessage: 'Please enter your 6-digit code without any dashes.',
  },
  recoveryCodeInputLabel: {
    id: 'TwoFactorAuth.RecoveryCodes.Form.InputLabel',
    defaultMessage: 'Please enter one of your alphanumeric recovery codes.',
  },
});

/**
 * Shows a SignIn form by default, with the ability to switch to SignUp form. It
 * also has the API methods binded, so you can use it directly.
 */
class SignInOrJoinFreeV2 extends React.Component {
  static propTypes = {
    /** Redirect URL */
    redirect: PropTypes.string,
    /** To pre-fill the "email" field */
    defaultEmail: PropTypes.string,
    /** Provide this to automatically sign in the given email */
    email: PropTypes.string,
    /** createUserQuery binding */
    createUser: PropTypes.func,
    /** Whether user can signup from there */
    disableSignup: PropTypes.bool,
    /** Use this prop to use this as a controlled component */
    form: PropTypes.oneOf(['signin', 'create-accountv2']),
    /** Set the initial view for the component */
    defaultForm: PropTypes.oneOf(['signin', 'create-accountv2']),
    /** If provided, component will use links instead of buttons to make the switch */
    routes: PropTypes.shape({
      signin: PropTypes.string,
      join: PropTypes.string,
    }),
    /** Label for signIn, defaults to "Continue with your email" */
    signInLabel: PropTypes.node,
    intl: PropTypes.object,
    enforceTwoFactorAuthForLoggedInUser: PropTypes.bool,
    submitTwoFactorAuthenticatorCode: PropTypes.func,
    submitRecoveryCode: PropTypes.func,
    router: PropTypes.object,
    addToast: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      form: this.props.defaultForm || 'signin',
      error: null,
      submitting: false,
      unknownEmailError: false,
      email: props.email || props.defaultEmail || '',
      useRecoveryCodes: null,
    };
  }

  componentDidMount() {
    // Auto signin if an email is provided
    if (this.props.email && isEmail(this.props.email)) {
      this.signIn(this.props.email, false);
    }
  }

  switchForm = form => {
    // Update local state
    this.setState({ form });
  };

  getRedirectURL() {
    let currentPath = window.location.pathname;
    if (window.location.search) {
      currentPath = currentPath + window.location.search;
    }
    return encodeURIComponent(this.props.redirect || currentPath || '/');
  }

  signIn = async (email, createProfile) => {
    if (this.state.submitting) {
      return false;
    }

    this.setState({ submitting: true, error: null });

    try {
      const response = await signin({
        user: { email },
        redirect: this.getRedirectURL(),
        websiteUrl: getWebsiteUrl(),
        createProfile: createProfile,
      });
      if (response.error?.errorCode === 'EMAIL_DOES_NOT_EXIST') {
        this.setState({ unknownEmailError: true, submitting: false });
        return;
      }

      // In dev/test, API directly returns a redirect URL for emails like
      // test*@opencollective.com.
      if (response.redirect) {
        await this.props.router.replace(response.redirect);
      } else {
        await this.props.router.push({ pathname: '/signin/sent', query: { email } });
      }
      window.scrollTo(0, 0);
    } catch (e) {
      this.props.addToast({
        type: TOAST_TYPE.ERROR,
        message: e.message || 'Server error',
      });
      this.setState({ submitting: false });
    }
  };

  createProfile = async data => {
    if (this.state.submitting) {
      return false;
    }
    const user = pick(data, ['email', 'name', 'legalName', 'newsletterOptIn']);
    const organizationData = pick(data, ['orgName', 'orgLegalName', 'githubHandle', 'twitterHandle', 'website']);
    const organization = Object.keys(organizationData).length > 0 ? organizationData : null;
    if (organization) {
      organization.name = organization.orgName;
      organization.legalName = organization.orgLegalName;
      delete organization.orgName;
      delete organization.orgLegalName;
    }

    this.setState({ submitting: true, error: null });

    try {
      await this.props.createUser({
        variables: {
          user,
          organization,
          redirect: this.getRedirectURL(),
          websiteUrl: getWebsiteUrl(),
        },
      });
      await this.props.router.push({ pathname: '/signin/sent', query: { email: user.email } });
      window.scrollTo(0, 0);
    } catch (error) {
      this.props.addToast({
        type: TOAST_TYPE.ERROR,
        message: error.message || 'Server error',
      });
      this.setState({ submitting: false });
    }
  };

  renderTwoFactorAuthBoxes = useRecoveryCodes => {
    const formKey = useRecoveryCodes ? 'recoveryCode' : 'twoFactorAuthenticatorCode';

    return (
      <StyledCard maxWidth={480} width={1} boxShadow={'0px 9px 14px 1px #dedede'}>
        <Box py={4} px={[3, 4]}>
          <H5 as="label" fontWeight="bold" htmlFor={formKey} mb={3} textAlign="left" display="block">
            {useRecoveryCodes ? (
              <FormattedMessage
                id="TwoFactorAuth.SignIn.RecoveryCodes"
                defaultMessage="Reset 2FA using a recovery code:"
              />
            ) : (
              <FormattedMessage id="TwoFactorAuth.SignIn" defaultMessage="Verify login using the 2FA code:" />
            )}
          </H5>
          <Formik
            initialValues={{
              twoFactorAuthenticatorCode: '',
              recoveryCode: '',
            }}
            onSubmit={async values => {
              const { twoFactorAuthenticatorCode, recoveryCode } = values;
              if (recoveryCode) {
                const user = await this.props.submitRecoveryCode(recoveryCode);
                return this.props.router.replace({
                  pathname: '/[slug]/admin/two-factor-auth',
                  query: { slug: user.collective.slug },
                });
              } else {
                return this.props.submitTwoFactorAuthenticatorCode(twoFactorAuthenticatorCode);
              }
            }}
          >
            {formik => {
              const { values, handleSubmit, isSubmitting } = formik;

              return (
                <Form>
                  <StyledInputField
                    name={formKey}
                    htmlFor={formKey}
                    label={
                      useRecoveryCodes
                        ? this.props.intl.formatMessage(messages.recoveryCodeInputLabel)
                        : this.props.intl.formatMessage(messages.twoFactorAuthCodeInputLabel)
                    }
                    value={values[formKey]}
                    required
                    mt={2}
                    mb={3}
                  >
                    {inputProps => (
                      <Field
                        as={StyledInput}
                        {...inputProps}
                        minWidth={300}
                        minHeight={75}
                        fontSize="20px"
                        pattern={useRecoveryCodes ? '[a-zA-Z0-9]{16}' : '[0-9]{6}'}
                        inputMode={useRecoveryCodes ? 'none' : 'numeric'}
                        autoFocus
                        data-cy={useRecoveryCodes ? null : 'signin-two-factor-auth-input'}
                      />
                    )}
                  </StyledInputField>

                  <Flex justifyContent={['center', 'left']} mb={4}>
                    <StyledButton
                      fontSize="13px"
                      minWidth="148px"
                      minHeight="36px"
                      buttonStyle="primary"
                      type="submit"
                      loading={isSubmitting}
                      onSubmit={handleSubmit}
                      data-cy={useRecoveryCodes ? null : 'signin-two-factor-auth-button'}
                    >
                      {useRecoveryCodes ? (
                        <FormattedMessage id="login.twoFactorAuth.reset" defaultMessage="Reset 2FA" />
                      ) : (
                        <FormattedMessage id="VerifyButton" defaultMessage="Verify" />
                      )}
                    </StyledButton>
                  </Flex>
                </Form>
              );
            }}
          </Formik>
          <Box>
            {useRecoveryCodes ? (
              <P>
                <FormattedMessage
                  id="login.twoFactorAuth.support"
                  defaultMessage="If you can't login with 2FA or recovery codes, please contact <SupportLink></SupportLink>."
                  values={{
                    SupportLink: I18nSupportLink,
                  }}
                />
              </P>
            ) : (
              <Fragment>
                <P fontWeight="bold" fontSize={14} mb={1} textAlign="left" display="block">
                  <FormattedMessage id="login.twoFactorAuth.havingTrouble" defaultMessage="Having trouble?" />
                </P>
                <StyledButton
                  type="button"
                  buttonSize="tiny"
                  isBorderless
                  buttonStyle="secondary"
                  mb={3}
                  onClick={() => this.setState({ useRecoveryCodes: true })}
                >
                  <P>
                    <FormattedMessage
                      id="login.twoFactorAuth.useRecoveryCodes"
                      defaultMessage="Use 2FA recovery codes."
                    />
                  </P>
                </StyledButton>
              </Fragment>
            )}
          </Box>
        </Box>
      </StyledCard>
    );
  };

  render() {
    const { submitting, error, unknownEmailError, email, useRecoveryCodes } = this.state;
    const displayedForm = this.props.form || this.state.form;
    const routes = this.props.routes || {};
    const { enforceTwoFactorAuthForLoggedInUser } = this.props;

    // No need to show the form if an email is provided
    const hasError = Boolean(unknownEmailError || error);
    if (this.props.email && !hasError) {
      return <Loading />;
    }

    return (
      <Flex flexDirection="column" width={1} alignItems="center">
        {enforceTwoFactorAuthForLoggedInUser ? (
          this.renderTwoFactorAuthBoxes(useRecoveryCodes)
        ) : (
          <Fragment>
            {displayedForm !== 'create-accountv2' ? (
              <SignInV2
                email={email}
                onEmailChange={email => this.setState({ email, unknownEmailError: false })}
                onSecondaryAction={routes.join || (() => this.switchForm('create-accountv2'))}
                onSubmit={email => this.signIn(email, false)}
                loading={submitting}
                unknownEmail={unknownEmailError}
                label={this.props.signInLabel}
                showSecondaryAction={!this.props.disableSignup}
              />
            ) : (
              <Flex flexDirection="column" width={1} alignItems="center">
                <Flex justifyContent="center" width={1}>
                  <Box maxWidth={575} mx={[2, 4]} width="100%">
                    <CreateProfileV2
                      email={email}
                      onEmailChange={email => this.setState({ email, unknownEmailError: false })}
                      onSubmit={this.createProfile}
                      onSecondaryAction={routes.signin || (() => this.switchForm('signin'))}
                      submitting={submitting}
                    />
                  </Box>
                </Flex>
              </Flex>
            )}
            <Container mt="128px" pl={['20px', '20px', '144px']} pr={['20px', '20px', '144px']} width={1}>
              <StyledHr borderStyle="solid" borderColor="black.200" mb="16px" />
              <Flex justifyContent="space-between">
                <Span>
                  <SignInFooterLink href="/privacypolicy">
                    <FormattedMessage defaultMessage="Read our privacy policy" />
                  </SignInFooterLink>
                </Span>
                <Span>
                  <SignInFooterLink href="/contact">
                    <FormattedMessage defaultMessage="Contact support" />
                  </SignInFooterLink>
                </Span>
              </Flex>
            </Container>
          </Fragment>
        )}
      </Flex>
    );
  }
}

const signupMutation = gql`
  mutation Signup($user: UserInputType!, $organization: CollectiveInputType, $redirect: String, $websiteUrl: String) {
    createUser(user: $user, organization: $organization, redirect: $redirect, websiteUrl: $websiteUrl) {
      user {
        id
        email
        name
      }
      organization {
        id
        slug
      }
    }
  }
`;

export const addSignupMutation = graphql(signupMutation, { name: 'createUser' });

export default withToasts(injectIntl(addSignupMutation(withRouter(SignInOrJoinFreeV2))));
