import React from 'react';
import { FormattedMessage } from 'react-intl';

import Container from '../components/Container';
import { Box, Flex } from '../components/Grid';
import Image from '../components/Image';
import Link from '../components/Link';
import Page from '../components/Page';
import StyledCard from '../components/StyledCard';
import StyledLink from '../components/StyledLink';
import { useUser } from '../components/UserProvider';

import Custom404 from './404';

const Welcome = () => {
  const { LoggedInUser, loadingLoggedInUser } = useUser();
  if (!loadingLoggedInUser && !LoggedInUser) {
    return <Custom404 />;
  }
  return (
    <Page title="Welcome to Open Collective!">
      <Flex flexDirection={['column', 'row']} mb="61px" mt="112px" justifyContent="center" alignItems="center">
        <Flex alignItems="center" mr={[0, '64px']} flexDirection={['column', 'row']}>
          <Box>
            <Image
              src="/static/images/create-profile-page-logo.png"
              alt="Open Collective logo"
              height={160}
              width={160}
            />
          </Box>
          <Container pl="16px" pr={['16px', 0]} width={['100%', '404px']}>
            <Flex fontSize="32px" fontWeight="700" color="black.900" lineHeight="40px">
              <FormattedMessage defaultMessage="Welcome to Open Collective!" />
            </Flex>
            <Flex fontSize="18px" fontWeight="400" color="black.800" lineHeight="26px" pt="14px">
              <FormattedMessage defaultMessage="Now that you have created your personal account, there are a couple of things you can do from here..." />
            </Flex>
          </Container>
        </Flex>
        <StyledCard
          width={['100%', '520px']}
          display="flex"
          flexDirection="column"
          alignItems="center"
          style={{ overflow: 'visible' }}
          mt={['100px', 0]}
        >
          <Box mt="-64px">
            <Image src="/static/images/sample-avatar.png" height="128px" width="128px" />
          </Box>
          <Flex fontSize="24px" fontWeight="700" color="black.900" lineHeight="32px" pt="40px" pb="40px">
            {LoggedInUser?.collective?.name}
          </Flex>
          <Link href="/create">
            <Container mt="16px" background="#F5FAFF" width={['300px', '472px']} borderRadius="8px">
              <Flex alignItems="center" p="13px">
                <Box width="386px">
                  <Flex fontSize="18px" fontWeight="700" color="black.900" lineHeight="26px">
                    <FormattedMessage id="collective.create" defaultMessage="Create Collective" />
                  </Flex>
                  <Flex fontSize="15px" fontWeight="500" color="black.700" lineHeight="22px" pt="14px">
                    <FormattedMessage defaultMessage="Create a Collective to be able to accept donations, apply for grants, and manage your budget transparently." />
                  </Flex>
                </Box>
                <Box pl="39px">
                  <Image src="/static/images/left-arrow.png" alt="Left Arrow" width="22px" height="20px" />
                </Box>
              </Flex>
            </Container>
          </Link>
          <Link href="/organizations/new">
            <Container mt="16px" width={['300px', '472px']} borderRadius="8px">
              <Flex alignItems="center" p="13px">
                <Box width="386px">
                  <Flex fontSize="18px" fontWeight="700" color="black.900" lineHeight="26px">
                    <FormattedMessage id="organization.create" defaultMessage="Create Organization" />
                  </Flex>
                  <Flex fontSize="15px" fontWeight="500" color="black.700" lineHeight="22px" pt="14px">
                    <FormattedMessage defaultMessage="Create a profile for your business to appear as financial contributor, enable your employees to contribute on behalf of your company, and more." />
                  </Flex>
                </Box>
                <Box pl="39px">
                  <Image src="/static/images/left-arrow.png" alt="Left Arrow" width="22px" height="20px" />
                </Box>
              </Flex>
            </Container>
          </Link>
          <Link href="/search">
            <Container mt="16px" width={['300px', '472px']} borderRadius="8px">
              <Flex alignItems="center" p="13px">
                <Box width="386px">
                  <Flex fontSize="18px" fontWeight="700" color="black.900" lineHeight="26px">
                    <FormattedMessage defaultMessage="Contribute and engage with more Collectives" />
                  </Flex>
                  <Flex fontSize="15px" fontWeight="500" color="black.700" lineHeight="22px" pt="14px">
                    <FormattedMessage defaultMessage="Discover active Collectives in the platform, contribute and engage with the communities that represent you." />
                  </Flex>
                </Box>
                <Box pl="39px">
                  <Image src="/static/images/left-arrow.png" alt="Left Arrow" width="22px" height="20px" />
                </Box>
              </Flex>
            </Container>
          </Link>
          <Flex justifyContent="space-between" width={['100%', '472px']} pl="13px" pr="13px" pb="32px" pt="40px">
            {LoggedInUser && (
              <StyledLink href={`${LoggedInUser.collective?.slug}/admin`}>
                <FormattedMessage defaultMessage="Go to settings" />
              </StyledLink>
            )}
            <StyledLink href={`/help`}>
              <FormattedMessage defaultMessage="View documentation" />
            </StyledLink>
          </Flex>
        </StyledCard>
      </Flex>
    </Page>
  );
};

export default Welcome;
